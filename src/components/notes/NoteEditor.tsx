import { useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '../../utils/invoke';
import { isTauriRuntime } from '../../utils/invoke';
import { useDebounce } from '../../hooks/useDebounce';
import { useProgressiveReveal } from '../../hooks/useProgressiveReveal';
import { AppMode, Note, ToolbarConfig, ToolbarToolId, ALL_TOOLBAR_TOOL_IDS } from '../../types';
import { classifyLine, LineContext } from '../../utils/lineContext';
import { buildActions, PaletteAction } from '../../utils/paletteActions';
import { extractBatchCards } from '../../utils/batchCardGen';
import SelectionToolbar from './SelectionToolbar';
import FormattingToolbar from './FormattingToolbar';
import WikilinkPopover from './WikilinkPopover';
import SmartColonPalette from './SmartColonPalette';

const SMART_AUTOPICK_ENABLED_KEY = 'kura.smartColon.autopick.enabled';
const SMART_AUTOPICK_THRESHOLD_KEY = 'kura.smartColon.autopick.threshold';
const DEFAULT_AUTOPICK_THRESHOLD = 0.88;

type AutoCreateUndoState = {
  cardIds: number[];
  label: string;
} | null;

type CreatedFlashcard = {
  id: number;
};

function getPlaceholderHint(length: number): string {
  if (length === 0) return 'Start writing, or type / for commands...';
  if (length < 50) return 'Keep going — highlight text to create a flashcard...';
  if (length < 200) return 'Try typing :: after any term or date to make a card...';
  return '';
}

type SlashCommand = {
  id: 'table' | 'image' | 'code' | 'flashcard';
  label: string;
  snippet: string;
};

export type EditorAction =
  | 'heading'
  | 'bullet'
  | 'bullet-star'
  | 'numbered'
  | 'quote'
  | 'table'
  | 'image'
  | 'code'
  | 'flashcard'
  | 'smart-colon'
  | 'indent'
  | 'outdent'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'highlight'
  | 'divider'
  | 'bullet-dash'
  | 'layout-top';

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'table',
    label: 'Table',
    snippet: '| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |'
  },
  {
    id: 'image',
    label: 'Image',
    snippet: '![Image description](https://)'
  },
  {
    id: 'code',
    label: 'Code block',
    snippet: '```\n\n```'
  },
  {
    id: 'flashcard',
    label: 'Flashcard',
    snippet: '**Q:** \n\n**A:** '
  }
];

interface Props {
  noteId: number | null;
  classId: number | null;
  appMode?: AppMode;
  toolbarConfig?: ToolbarConfig;
  onToolbarEnabledToolsChange?: (tools: ToolbarToolId[]) => void;
}

export default function NoteEditor({ noteId, classId, appMode = 'focus', toolbarConfig, onToolbarEnabledToolsChange }: Props) {
  const typingTimer = useRef<number | null>(null);

  const [note, setNote] = useState<Note | null>(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSmartPalette, setShowSmartPalette] = useState(false);
  const [smartPaletteContext, setSmartPaletteContext] = useState<LineContext | null>(null);
  const [smartPaletteLine, setSmartPaletteLine] = useState('');
  const [smartPaletteLineIndex, setSmartPaletteLineIndex] = useState<number | null>(null);
  const [smartPalettePosition, setSmartPalettePosition] = useState<{ x: number; y: number } | null>(null);
  const [smartPaletteIndex, setSmartPaletteIndex] = useState(0);
  const [smartMarkers, setSmartMarkers] = useState<Array<{ id: number; lineIndex: number; label: string; contextType: LineContext['type'] }>>([]);
  const [autoCreateUndo, setAutoCreateUndo] = useState<AutoCreateUndoState>(null);
  
  // Phase 2 states
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  
  const [showWikilinks, setShowWikilinks] = useState(false);
  const [wikilinkQuery, setWikilinkQuery] = useState('');
  const [wikilinkIndex, setWikilinkIndex] = useState(0);
  const [wikilinkPos, setWikilinkPos] = useState<{ x: number; y: number } | null>(null);
  const [wikilinkCount, setWikilinkCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const editorRootRef = useRef<HTMLElement | null>(null);
  const smartMarkerIdRef = useRef(1);
  
  const debouncedText = useDebounce(text, 3000);
  const debouncedTitle = useDebounce(title, 3000);
  const textLines = useMemo(() => text.split('\n'), [text]);
  const { bump } = useProgressiveReveal();

  const smartPaletteActions = useMemo(() => {
    if (!smartPaletteContext) {
      return [];
    }

    return buildActions(
      smartPaletteContext,
      smartPaletteLine,
      textLines,
      smartPaletteLineIndex ?? 0
    );
  }, [smartPaletteContext, smartPaletteLine, smartPaletteLineIndex, textLines]);

  const closeSmartPalette = () => {
    setShowSmartPalette(false);
    setSmartPaletteContext(null);
    setSmartPaletteLine('');
    setSmartPaletteLineIndex(null);
    setSmartPalettePosition(null);
    setSmartPaletteIndex(0);
  };

  const measureSmartPalettePosition = (textarea: HTMLTextAreaElement, lineText: string, lineIndex: number) => {
    const rect = textarea.getBoundingClientRect();
    const computed = window.getComputedStyle(textarea);
    const paddingLeft = Number.parseFloat(computed.paddingLeft || '0') || 0;
    const paddingTop = Number.parseFloat(computed.paddingTop || '0') || 0;
    const lineHeight = Number.parseFloat(computed.lineHeight || '18') || 18;
    const font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const width = context ? (context.font = font, context.measureText(lineText).width) : lineText.length * 8;

    return {
      x: rect.left + paddingLeft + Math.min(width, rect.width - 48) - textarea.scrollLeft,
      y: rect.top + paddingTop + (lineIndex * lineHeight) - textarea.scrollTop
    };
  };

  const measureSlashMenuPosition = (textarea: HTMLTextAreaElement, value: string, cursor: number) => {
    const root = editorRootRef.current;
    if (!root) {
      return { x: 24, y: 120 };
    }

    const rootRect = root.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    const computed = window.getComputedStyle(textarea);
    const paddingLeft = Number.parseFloat(computed.paddingLeft || '0') || 0;
    const paddingTop = Number.parseFloat(computed.paddingTop || '0') || 0;
    const lineHeight = Number.parseFloat(computed.lineHeight || '18') || 18;
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const linePrefix = value.slice(lineStart, cursor);
    const lineIndex = value.slice(0, cursor).split('\n').length - 1;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    }
    const lineWidth = context ? context.measureText(linePrefix).width : linePrefix.length * 8;

    const menuWidth = 230;
    const menuHeight = 170;
    const rawX = textareaRect.left + paddingLeft + Math.min(lineWidth, textareaRect.width - menuWidth - 14);
    const rawY = textareaRect.top + paddingTop + ((lineIndex + 1) * lineHeight) + 6;

    const clampedX = Math.max(rootRect.left + 12, Math.min(rawX, rootRect.right - menuWidth - 12));
    const clampedY = Math.max(rootRect.top + 72, Math.min(rawY, rootRect.bottom - menuHeight - 12));

    return {
      x: clampedX - rootRect.left,
      y: clampedY - rootRect.top
    };
  };

  const markSmartColonLine = (contextType: LineContext['type'], lineIndex: number, label: string) => {
    setSmartMarkers((prev) => [
      { id: smartMarkerIdRef.current++, lineIndex, label, contextType },
      ...prev
    ].slice(0, 12));
  };

  const getIndentDepth = (line: string) => {
    const whitespace = (line.match(/^(\s*)/)?.[1] ?? '').replace(/\t/g, '  ');
    return Math.floor(whitespace.length / 2);
  };

  const cleanLineText = (line: string) => {
    return line
      .replace(/::/g, '')
      .replace(/^\s*[-*•◦▪■]\s*/, '')
      .replace(/^\s*#{1,6}\s*/, '')
      .replace(/^\s*>\s*/, '')
      .trim();
  };

  const getHeadingContext = (allLines: string[], lineIndex: number) => {
    for (let index = lineIndex; index >= 0; index -= 1) {
      const candidate = allLines[index] ?? '';
      const match = candidate.match(/^\s*(#{1,6})\s+(.+)$/);
      if (!match) {
        continue;
      }

      return {
        level: match[1].length,
        text: cleanLineText(match[2] ?? '')
      };
    }

    return null;
  };

  const isLikelyTopicLine = (rawLine: string) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return false;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      return true;
    }

    if (/^[-*•◦▪■]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed) || /^>\s*/.test(trimmed)) {
      return false;
    }

    const cleaned = cleanLineText(trimmed);
    if (!cleaned || cleaned.includes('::')) {
      return false;
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length > 10) {
      return false;
    }

    return true;
  };

  const findTopicAnchor = (allLines: string[], lineIndex: number) => {
    const currentDepth = getIndentDepth(allLines[lineIndex] ?? '');

    for (let index = lineIndex - 1; index >= 0; index -= 1) {
      const raw = allLines[index] ?? '';
      if (!raw.trim()) {
        continue;
      }

      const heading = raw.match(/^\s*(#{1,6})\s+(.+)$/);
      if (heading) {
        return cleanLineText(heading[2] ?? '');
      }

      const depth = getIndentDepth(raw);
      if (depth > currentDepth) {
        continue;
      }

      if (isLikelyTopicLine(raw)) {
        return cleanLineText(raw);
      }

      if (depth < currentDepth) {
        return cleanLineText(raw);
      }
    }

    return '';
  };

  const extractContextWindow = (allLines: string[], lineIndex: number, radius = 2) => {
    const currentRaw = allLines[lineIndex] ?? '';
    const currentDepth = getIndentDepth(currentRaw);
    const start = Math.max(0, lineIndex - radius);
    const end = Math.min(allLines.length - 1, lineIndex + radius);
    const lines: string[] = [];

    for (let index = start; index <= end; index += 1) {
      const raw = allLines[index] ?? '';
      if (!raw.trim()) {
        continue;
      }

      if (index !== lineIndex && getIndentDepth(raw) !== currentDepth) {
        continue;
      }

      lines.push(cleanLineText(raw));
    }

    return {
      start,
      end,
      lines: lines.filter(Boolean)
    };
  };

  const findParentPromptLine = (allLines: string[], lineIndex: number) => {
    const currentRaw = allLines[lineIndex] ?? '';
    const currentDepth = getIndentDepth(currentRaw);

    for (let index = lineIndex - 1; index >= 0; index -= 1) {
      const candidateRaw = allLines[index] ?? '';
      if (!candidateRaw.trim()) {
        continue;
      }
      if (getIndentDepth(candidateRaw) < currentDepth) {
        return cleanLineText(candidateRaw);
      }
    }

    for (let index = lineIndex - 1; index >= 0; index -= 1) {
      const candidateRaw = allLines[index] ?? '';
      if (!candidateRaw.trim()) {
        continue;
      }
      return cleanLineText(candidateRaw);
    }

    return '';
  };

  const buildDefinitionFront = (allLines: string[], lineIndex: number, currentLine: string) => {
    const parent = findParentPromptLine(allLines, lineIndex);
    if (parent) {
      if (/^(what|who|when|where|why|how)\b/i.test(parent)) {
        return parent.endsWith('?') ? parent : `${parent}?`;
      }

      const normalized = parent.replace(/[\s:.-]+$/, '').trim();
      return normalized ? `What is ${normalized}?` : 'What is this?';
    }

    const fallback = cleanLineText(currentLine);
    return fallback ? `What does this line mean in context?` : 'What is this?';
  };

  const resolveFlashcardFields = (action: PaletteAction, allLines: string[], lineIndex: number, currentLine: string) => {
    const currentLineText = cleanLineText(currentLine);
    let front = (action.front ?? '').trim();
    let back = (action.back ?? '').trim();
    const contextWindow = extractContextWindow(allLines, lineIndex);
    const heading = getHeadingContext(allLines, lineIndex);
    const topicAnchor = findTopicAnchor(allLines, lineIndex);

    if (!back && currentLineText) {
      const shouldDeriveFrontFromParent = !front || front === currentLineText;
      if (shouldDeriveFrontFromParent) {
        front = buildDefinitionFront(allLines, lineIndex, currentLineText);
      }
      back = currentLineText;
    }

    if (!front) {
      front = buildDefinitionFront(allLines, lineIndex, currentLineText);
    }

    const hasContextBack = !back && contextWindow.lines.length > 1;
    if (hasContextBack) {
      const neighbors = contextWindow.lines.filter((line) => line !== currentLineText).slice(0, 2);
      if (neighbors.length > 0) {
        back = `${currentLineText}\n\nContext:\n- ${neighbors.join('\n- ')}`;
      }
    }

    if (heading?.text && !front.toLowerCase().includes(heading.text.toLowerCase())) {
      front = `In ${heading.text}, ${front.charAt(0).toLowerCase()}${front.slice(1)}`;
    }

    if (topicAnchor && !front.toLowerCase().includes(topicAnchor.toLowerCase())) {
      front = `${topicAnchor}: ${front}`;
    }

    if (topicAnchor && back && !back.toLowerCase().includes(topicAnchor.toLowerCase())) {
      back = `${topicAnchor} - ${back}`;
    }

    return {
      front,
      back
    };
  };

  const chooseAutoAction = (
    context: LineContext,
    actions: PaletteAction[],
    allLines: string[],
    lineIndex: number
  ) => {
    if (actions.length === 0) {
      return null;
    }

    const largeNote = allLines.length >= 800;
    const batchCandidate = actions.find((action) => action.type === 'batch' && (action.cards?.length ?? 0) >= 3);
    const primary = actions.find((action) => action.isPrimary) ?? actions[0];

    // For deep outlines or long lists, prioritize batching so the user is not interrupted repeatedly.
    if ((context.type === 'classification' || context.type === 'nested') && batchCandidate) {
      return batchCandidate;
    }

    if (largeNote) {
      if (batchCandidate && (batchCandidate.cards?.length ?? 0) >= 5) {
        return batchCandidate;
      }
      return primary;
    }

    // In Focus mode, always decide for the user unless they explicitly force chooser.
    if (appMode === 'focus') {
      return primary;
    }

    return primary;
  };

  const isAutoPickEnabled = () => {
    const raw = window.localStorage.getItem(SMART_AUTOPICK_ENABLED_KEY);
    if (raw === null) {
      return true;
    }
    return raw === 'true';
  };

  const getAutoPickThreshold = () => {
    const raw = window.localStorage.getItem(SMART_AUTOPICK_THRESHOLD_KEY);
    const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
    if (Number.isFinite(parsed)) {
      return Math.max(0.5, Math.min(0.99, parsed));
    }
    return DEFAULT_AUTOPICK_THRESHOLD;
  };

  const applySmartAction = async (
    action: PaletteAction,
    params: {
      context: LineContext;
      lineIndex: number;
      currentLine: string;
      sourceMode: 'palette' | 'auto';
    }
  ) => {
    const textarea = textareaRef.current;
    const { context, lineIndex, currentLine, sourceMode } = params;

    if (!textarea) {
      return;
    }

    const allLines = textLines;
    const contextWindow = extractContextWindow(allLines, lineIndex);
    const heading = getHeadingContext(allLines, lineIndex);
    const topicAnchor = findTopicAnchor(allLines, lineIndex);

    const sourceNoteId = note?.id ?? noteId;
    const classIdForCards = classId ?? note?.classId ?? null;
    const sourcePayload = {
      noteId: sourceNoteId,
      classId: classIdForCards,
      sourceLine: currentLine,
      sourceLineIndex: lineIndex,
      contextType: context.type,
      contextLabel: context.label,
      metadataJson: JSON.stringify({
        ...context.metadata,
        autoCreated: sourceMode === 'auto',
        heading: heading?.text ?? null,
        headingLevel: heading?.level ?? null,
        topicAnchor: topicAnchor || null,
        contextWindow: {
          startIndex: contextWindow.start,
          endIndex: contextWindow.end,
          lines: contextWindow.lines
        }
      })
    };

    try {
      if (action.type === 'flashcard') {
        const cardFields = resolveFlashcardFields(action, allLines, lineIndex, currentLine);
        const created = await invoke<CreatedFlashcard>('create_flashcard', {
          ...sourcePayload,
          front: cardFields.front,
          back: cardFields.back
        });
        markSmartColonLine(context.type, lineIndex, action.title);
        bump('flashcardsCreated');
        if (sourceMode === 'auto') {
          setAutoCreateUndo({ cardIds: [created.id], label: action.title });
          setStatus(`Auto-created card (${action.title})`);
        } else {
          setStatus('Card saved');
        }
        window.setTimeout(() => setStatus(''), 1200);
        window.dispatchEvent(new CustomEvent('kura:data-invalidated'));
        return;
      }

      if (action.type === 'batch') {
        const cards = action.cards?.length ? action.cards : extractBatchCards(allLines, lineIndex);
        const createdCardIds: number[] = [];
        for (const card of cards) {
          if (!card.front.trim() && !card.back.trim()) {
            continue;
          }

          const created = await invoke<CreatedFlashcard>('create_flashcard', {
            ...sourcePayload,
            front: card.front,
            back: card.back
          });
          createdCardIds.push(created.id);
        }

        if (cards.length > 0) {
          markSmartColonLine(context.type, lineIndex, action.title);
          bump('flashcardsCreated', cards.length);
          if (sourceMode === 'auto' && createdCardIds.length > 0) {
            setAutoCreateUndo({ cardIds: createdCardIds, label: action.title });
          }
          setStatus(`Saved ${cards.length} cards`);
          window.setTimeout(() => setStatus(''), 1200);
          window.dispatchEvent(new CustomEvent('kura:data-invalidated'));
        }
        return;
      }

      if (action.type === 'format' && action.snippet) {
        insertSnippet(action.snippet);
      }
    } catch {
      setStatus('Card creation failed');
    }
  };

  const handleSmartPaletteSelect = async (action: PaletteAction) => {
    const context = smartPaletteContext;
    const lineIndex = smartPaletteLineIndex;
    const currentLine = smartPaletteLine;

    closeSmartPalette();
    if (!context || lineIndex === null) {
      return;
    }

    await applySmartAction(action, {
      context,
      lineIndex,
      currentLine,
      sourceMode: 'palette'
    });
  };

  const undoAutoCreatedCards = async () => {
    if (!autoCreateUndo?.cardIds?.length) {
      return;
    }

    try {
      for (const cardId of autoCreateUndo.cardIds) {
        await invoke('delete_flashcard', { cardId });
      }
      setAutoCreateUndo(null);
      setStatus('Auto-created card undone');
      window.setTimeout(() => setStatus(''), 1200);
      window.dispatchEvent(new CustomEvent('kura:data-invalidated'));
    } catch {
      setStatus('Undo failed');
    }
  };

  const flushSave = () => {
    if (!note) return;
    if (text === note.rawContent && title === note.title) return;

    setStatus('Saving...');
    invoke<Note>('save_note', {
      noteId: note.id,
      classId: classId ?? note.classId ?? null,
      folderId: note.folderId ?? null,
      title,
      rawContent: text
    })
      .then((saved) => {
        setNote(saved);
        setStatus('Saved');
        bump('notesSaved');
        window.setTimeout(() => setStatus(''), 1200);
      })
      .catch(() => setStatus('Save failed'));
  };

  const updateTextWithSelection = (nextText: string, selectionStart: number, selectionEnd = selectionStart) => {
    setText(nextText);
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const getLineRange = (value: string, cursor: number) => {
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const nextNewline = value.indexOf('\n', cursor);
    const lineEnd = nextNewline === -1 ? value.length : nextNewline;
    return { lineStart, lineEnd };
  };

  const getCurrentLine = (value: string, cursor: number) => {
    const { lineStart, lineEnd } = getLineRange(value, cursor);
    return {
      lineStart,
      lineEnd,
      line: value.slice(lineStart, lineEnd)
    };
  };

  const getSelectionLineRange = (value: string, selectionStart: number, selectionEnd: number) => {
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const nextNewline = value.indexOf('\n', end);
    const lineEnd = nextNewline === -1 ? value.length : nextNewline;
    return { lineStart, lineEnd };
  };

  const applyIndent = (value: string, selectionStart: number, selectionEnd: number, outdent: boolean) => {
    const isCollapsed = selectionStart === selectionEnd;

    if (!isCollapsed) {
      const { lineStart, lineEnd } = getSelectionLineRange(value, selectionStart, selectionEnd);
      const selectedBlock = value.slice(lineStart, lineEnd);
      const lines = selectedBlock.split('\n');

      const nextLines = outdent
        ? lines.map((line) => {
            if (line.startsWith('  ')) return line.slice(2);
            if (line.startsWith('\t')) return line.slice(1);
            if (line.startsWith(' ')) return line.slice(1);
            return line;
          })
        : lines.map((line) => `  ${line}`);

      const nextBlock = nextLines.join('\n');
      const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
      updateTextWithSelection(nextValue, lineStart, lineStart + nextBlock.length);
      return true;
    }

    const { lineStart, line } = getCurrentLine(value, selectionStart);
    const listMatch = line.match(/^(\s*)((?:[-*])|(?:\d+\.))\s(.*)$/);
    if (!listMatch) return false;

    if (outdent) {
      const indentToRemove = Math.min(2, listMatch[1].length);
      if (indentToRemove === 0) return false;
      const nextValue = value.slice(0, lineStart) + line.slice(indentToRemove) + value.slice(lineStart + line.length);
      updateTextWithSelection(nextValue, selectionStart - indentToRemove);
      return true;
    }

    const nextValue = value.slice(0, lineStart) + `  ${line}` + value.slice(lineStart + line.length);
    updateTextWithSelection(nextValue, selectionStart + 2);
    return true;
  };

  const applyLinePrefix = (value: string, selectionStart: number, selectionEnd: number, prefix: string) => {
    const isCollapsed = selectionStart === selectionEnd;

    if (isCollapsed) {
      const { lineStart, line } = getCurrentLine(value, selectionStart);
      const trimmed = line.trimStart();
      const leading = line.slice(0, line.length - trimmed.length);
      const clean = trimmed.replace(/^(#{1,6}\s+|[-*]\s+|>\s+)/, '');
      const nextLine = `${leading}${prefix}${clean}`;
      const nextValue = value.slice(0, lineStart) + nextLine + value.slice(lineStart + line.length);
      const cursorDelta = nextLine.length - line.length;
      updateTextWithSelection(nextValue, selectionStart + cursorDelta);
      return;
    }

    const { lineStart, lineEnd } = getSelectionLineRange(value, selectionStart, selectionEnd);
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n').map((line) => {
      const trimmed = line.trimStart();
      const leading = line.slice(0, line.length - trimmed.length);
      const clean = trimmed.replace(/^(#{1,6}\s+|[-*]\s+|>\s+)/, '');
      return `${leading}${prefix}${clean}`;
    });
    const nextBlock = lines.join('\n');
    const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
    updateTextWithSelection(nextValue, lineStart, lineStart + nextBlock.length);
  };

  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const nextValue = value.slice(0, selectionStart) + snippet + value.slice(selectionEnd);
    updateTextWithSelection(nextValue, selectionStart + snippet.length);
  };

  const applySlashCommand = (command: SlashCommand) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const nextValue = value.slice(0, selectionStart) + command.snippet + value.slice(selectionEnd);
    const cursor = selectionStart + command.snippet.length;
    updateTextWithSelection(nextValue, cursor);
    setShowSlashMenu(false);
  };

  const closeSlashMenu = () => {
    setShowSlashMenu(false);
    setSlashIndex(0);
    setSlashMenuPosition(null);
  };

  useEffect(() => {
    if (!noteId) {
      setNote(null);
      setText('');
      setTitle('');
      setSmartMarkers([]);
      closeSlashMenu();
      closeSmartPalette();
      return;
    }

    invoke<Note>('load_note', { noteId }).then((loaded) => {
      setNote(loaded);
      setText(loaded.rawContent);
      setTitle(loaded.title ?? 'Untitled');
      closeSlashMenu();
      closeSmartPalette();
      setSmartMarkers([]);
    });
  }, [noteId]);

  const isDirty = useMemo(() => {
    if (!note) return false;
    return debouncedText !== note.rawContent || debouncedTitle !== note.title;
  }, [debouncedText, debouncedTitle, note]);

  useEffect(() => {
    if (!noteId || isDirty) {
      return;
    }

    const refreshCurrentNote = () => {
      invoke<Note>('load_note', { noteId })
        .then((loaded) => {
          setNote(loaded);
          setText(loaded.rawContent);
          setTitle(loaded.title ?? 'Untitled');
        })
        .catch(() => {
          /* keep the current editor state if reload fails */
        });
    };

    window.addEventListener('kura:data-invalidated', refreshCurrentNote as EventListener);

    let unlisten: (() => void) | null = null;
    if (isTauriRuntime) {
      void listen('kura:data-invalidated', refreshCurrentNote).then((dispose) => {
        unlisten = dispose;
      });
    }

    return () => {
      window.removeEventListener('kura:data-invalidated', refreshCurrentNote as EventListener);
      unlisten?.();
    };
  }, [noteId, isDirty]);

  useEffect(() => {
    if (!note || !isDirty) return;

    setStatus('Saving...');
    invoke<Note>('save_note', {
      noteId: note.id,
      classId: classId ?? note.classId ?? null,
      folderId: note.folderId ?? null,
      title: debouncedTitle,
      rawContent: debouncedText
    })
      .then((saved) => {
        setNote(saved);
        setStatus('Saved');
        bump('notesSaved');
        window.setTimeout(() => setStatus(''), 1200);
      })
      .catch(() => setStatus('Save failed'));
  }, [debouncedText, debouncedTitle]);

  useEffect(() => {
    if (!noteId) return;
    textareaRef.current?.focus();
  }, [noteId]);

  useEffect(() => {
    function onFlushRequest() {
      flushSave();
    }
    window.addEventListener('kura:editor-flush', onFlushRequest);
    return () => window.removeEventListener('kura:editor-flush', onFlushRequest);
  });
  
  useEffect(() => {
    function onWikilinkFiltered(e: Event) {
      if (e instanceof CustomEvent) {
        setWikilinkCount(e.detail);
      }
    }
    window.addEventListener('kura:wikilink-filtered', onWikilinkFiltered);
    return () => window.removeEventListener('kura:wikilink-filtered', onWikilinkFiltered);
  }, []);

  useEffect(() => {
    function onEditorAction(event: Event) {
      if (!noteId || !(event instanceof CustomEvent)) return;

      const action = event.detail as EditorAction;
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.focus();
      const { selectionStart, selectionEnd, value } = textarea;

      // ── Line prefix commands ─────────────────────────────────────────────────
      if (action === 'heading') return applyLinePrefix(value, selectionStart, selectionEnd, '# ');
      if (action === 'bullet' || action === 'bullet-dash') return applyLinePrefix(value, selectionStart, selectionEnd, '- ');
      if (action === 'bullet-star') return applyLinePrefix(value, selectionStart, selectionEnd, '* ');
      if (action === 'numbered') return applyLinePrefix(value, selectionStart, selectionEnd, '1. ');
      if (action === 'quote') return applyLinePrefix(value, selectionStart, selectionEnd, '> ');

      // ── Snippet inserts ──────────────────────────────────────────────────────
      if (action === 'table') return insertSnippet(SLASH_COMMANDS.find((item) => item.id === 'table')?.snippet ?? '');
      if (action === 'image') return insertSnippet(SLASH_COMMANDS.find((item) => item.id === 'image')?.snippet ?? '');
      if (action === 'code') return insertSnippet('```\n\n```');
      if (action === 'divider') return insertSnippet('\n---\n');
      if (action === 'flashcard') return insertSnippet(SLASH_COMMANDS.find((item) => item.id === 'flashcard')?.snippet ?? '');

      // ── Smart-colon — appends " :: " to end of current line ──────────────────
      if (action === 'smart-colon') {
        const { lineEnd } = getLineRange(value, selectionStart);
        const insertion = ' :: ';
        const nextValue = value.slice(0, lineEnd) + insertion + value.slice(lineEnd);
        return updateTextWithSelection(nextValue, lineEnd + insertion.length);
      }

      // ── Indentation ──────────────────────────────────────────────────────────
      if (action === 'indent') return applyIndent(value, selectionStart, selectionEnd, false);
      if (action === 'outdent') return applyIndent(value, selectionStart, selectionEnd, true);

      // ── Inline wrappers ──────────────────────────────────────────────────────
      if (action === 'bold') {
        const inner = value.slice(selectionStart, selectionEnd);
        const insertion = `**${inner}**`;
        const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
        return updateTextWithSelection(nextValue, selectionStart + 2, selectionStart + insertion.length - 2);
      }
      if (action === 'italic') {
        const inner = value.slice(selectionStart, selectionEnd);
        const insertion = `_${inner}_`;
        const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
        return updateTextWithSelection(nextValue, selectionStart + 1, selectionStart + insertion.length - 1);
      }
      if (action === 'strikethrough') {
        const inner = value.slice(selectionStart, selectionEnd);
        const insertion = `~~${inner}~~`;
        const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
        return updateTextWithSelection(nextValue, selectionStart + 2, selectionStart + insertion.length - 2);
      }
      if (action === 'highlight') {
        const inner = value.slice(selectionStart, selectionEnd);
        const insertion = `==${inner}==`;
        const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
        return updateTextWithSelection(nextValue, selectionStart + 2, selectionStart + insertion.length - 2);
      }
    }

    window.addEventListener('kura:editor-action', onEditorAction);
    return () => window.removeEventListener('kura:editor-action', onEditorAction);
  }, [noteId]);

  if (!noteId) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', color: '#5f6a66' }}>
        Select or create a note from the sidebar.
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Emit typing event for the toolbar auto-hide system
    window.dispatchEvent(new CustomEvent('kura:editor-typing'));
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kura:editor-idle'));
    }, 1800);
    
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const isCollapsed = selectionStart === selectionEnd;

    if (showSmartPalette) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSmartPalette();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSmartPaletteIndex((prev) => Math.min(prev + 1, Math.max(0, smartPaletteActions.length - 1)));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSmartPaletteIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSmartPaletteSelect(smartPaletteActions[smartPaletteIndex] ?? smartPaletteActions[0]);
        return;
      }

      if (['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const index = Number.parseInt(e.key, 10) - 1;
        const action = smartPaletteActions[index];
        if (action) {
          setSmartPaletteIndex(index);
          void handleSmartPaletteSelect(action);
        }
        return;
      }

      e.preventDefault();
      return;
    }
    
    if (showWikilinks) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setWikilinkIndex((prev) => (prev + 1) % Math.max(1, wikilinkCount));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setWikilinkIndex((prev) => (prev - 1 + Math.max(1, wikilinkCount)) % Math.max(1, wikilinkCount));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const activeEl = document.getElementById(`wikilink-item-${wikilinkIndex}`);
        if (activeEl) activeEl.click();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowWikilinks(false);
        return;
      }
    }

    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        applySlashCommand(SLASH_COMMANDS[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSlashMenu();
        return;
      }
    }

    if (!isCollapsed && e.key === 'Tab') {
      e.preventDefault();
      applyIndent(value, selectionStart, selectionEnd, e.shiftKey);
      closeSlashMenu();
      setShowWikilinks(false);
      return;
    }

    if (!isCollapsed) {
      if (showSlashMenu) closeSlashMenu();
      if (showWikilinks) setShowWikilinks(false);
      return;
    }

    if (e.key === '/') {
      const { line } = getCurrentLine(value, selectionStart);
      if (line.trim() === '') {
        e.preventDefault();
        setShowSlashMenu(true);
        setSlashIndex(0);
        setSlashMenuPosition(measureSlashMenuPosition(textarea, value, selectionStart));
        return;
      }
    }
    
    if (e.key === '[') {
      const { lineStart } = getCurrentLine(value, selectionStart);
      const typedPrefix = value.slice(lineStart, selectionStart);
      if (typedPrefix.endsWith('[')) {
        e.preventDefault();
        const insertion = '[]]';
        const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
        updateTextWithSelection(nextValue, selectionStart + 1);
        setShowWikilinks(true);
        setWikilinkQuery('');
        setWikilinkIndex(0);
        
        // Approximate pos
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.x > 0 && rect.y > 0) {
                setWikilinkPos({ x: rect.x, y: rect.y });
            } else {
                setWikilinkPos({ x: 300, y: 300 }); 
            }
        } else {
           setWikilinkPos({ x: 300, y: 300 }); 
        }
        return;
      }
    }

    if (e.key === ' ') {
      const { lineStart, line } = getCurrentLine(value, selectionStart);
      const typedPrefix = value.slice(lineStart, selectionStart);
      if (typedPrefix === '#' || typedPrefix === '>' || typedPrefix === '-' || typedPrefix === '*') {
        e.preventDefault();
        const marker = typedPrefix === '*' ? '-' : typedPrefix;
        const nextLine = `${marker} ${line.slice(typedPrefix.length)}`;
        const nextValue = value.slice(0, lineStart) + nextLine + value.slice(lineStart + line.length);
        updateTextWithSelection(nextValue, lineStart + marker.length + 1);
        closeSlashMenu();
        return;
      }
    }

    const closePairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"'
    };
    const closePair = closePairs[e.key];
    if (closePair) {
      e.preventDefault();
      const nextValue = value.slice(0, selectionStart) + e.key + closePair + value.slice(selectionEnd);
      updateTextWithSelection(nextValue, selectionStart + 1);
      closeSlashMenu();
      return;
    }

    if (e.key === 'Enter') {
      const { lineStart, line } = getCurrentLine(value, selectionStart);
      const bulletMatch = line.match(/^(\s*)([-*])\s(.*)$/);
      const orderedMatch = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      const quoteMatch = line.match(/^(\s*>\s?)(.*)$/);
      const headingMatch = line.match(/^(\s*#{1,6}\s)(.*)$/);

      if (bulletMatch) {
        e.preventDefault();
        const [, indent, marker, content] = bulletMatch;
        if (content.trim() === '') {
          const nextValue = value.slice(0, lineStart) + indent + value.slice(lineStart + line.length);
          updateTextWithSelection(nextValue, lineStart + indent.length);
        } else {
          const insertion = `\n${indent}${marker} `;
          const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
          updateTextWithSelection(nextValue, selectionStart + insertion.length);
        }
        closeSlashMenu();
        return;
      }

      if (orderedMatch) {
        e.preventDefault();
        const [, indent, numberText, content] = orderedMatch;
        if (content.trim() === '') {
          const nextValue = value.slice(0, lineStart) + indent + value.slice(lineStart + line.length);
          updateTextWithSelection(nextValue, lineStart + indent.length);
        } else {
          const nextNumber = Number(numberText) + 1;
          const insertion = `\n${indent}${nextNumber}. `;
          const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
          updateTextWithSelection(nextValue, selectionStart + insertion.length);
        }
        closeSlashMenu();
        return;
      }

      if (quoteMatch) {
        e.preventDefault();
        const [, quotePrefix, content] = quoteMatch;
        if (content.trim() === '') {
          const nextValue = value.slice(0, lineStart) + value.slice(lineStart + line.length);
          updateTextWithSelection(nextValue, lineStart);
        } else {
          const insertion = `\n${quotePrefix}`;
          const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
          updateTextWithSelection(nextValue, selectionStart + insertion.length);
        }
        closeSlashMenu();
        return;
      }

      if (headingMatch) {
        e.preventDefault();
        const insertion = '\n';
        const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
        updateTextWithSelection(nextValue, selectionStart + 1);
        closeSlashMenu();
        return;
      }
    }

    if (e.key === ':' && isCollapsed) {
      const { lineStart, lineEnd, line } = getCurrentLine(value, selectionStart);
      const beforeCursor = value.slice(0, selectionStart);
      const afterCursor = value.slice(selectionStart, lineEnd);

      if (beforeCursor.endsWith(':') && afterCursor.trim().length === 0) {
        e.preventDefault();

        const cleanedLine = line.replace(/:\s*$/, '').trim();
        const nextValue = value.slice(0, selectionStart - 1) + value.slice(selectionStart);
        const nextLineIndex = nextValue.slice(0, lineStart).split('\n').length - 1;

        setText(nextValue);
        window.requestAnimationFrame(() => {
          textareaRef.current?.setSelectionRange(selectionStart - 1, selectionStart - 1);
        });

        const nextLines = nextValue.split('\n');
        const ctx = classifyLine(cleanedLine, nextLines, nextLineIndex);
        const actions = buildActions(ctx, cleanedLine, nextLines, nextLineIndex);
        const autoAction = chooseAutoAction(ctx, actions, nextLines, nextLineIndex);
        const forceAutoInFocus = appMode === 'focus' && !e.altKey;
        const shouldAutoCreate =
          !e.altKey &&
          !!autoAction &&
          (forceAutoInFocus || (isAutoPickEnabled() && ctx.confidence >= getAutoPickThreshold()));

        if (shouldAutoCreate && autoAction) {
          void applySmartAction(autoAction, {
            context: ctx,
            lineIndex: nextLineIndex,
            currentLine: cleanedLine,
            sourceMode: 'auto'
          });
        } else {
          setSmartPaletteContext(ctx);
          setSmartPaletteLine(cleanedLine);
          setSmartPaletteLineIndex(nextLineIndex);
          setSmartPaletteIndex(0);
          setShowSmartPalette(true);
          const palettePos = measureSmartPalettePosition(textarea, cleanedLine || line, nextLineIndex);
          setSmartPalettePosition(palettePos);
        }

        bump('smartColonUsed');
        return;
      }
    }

    if (showSlashMenu && e.key.length === 1) closeSlashMenu();
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      
      if (showWikilinks) {
        const textBeforeCursor = e.target.value.slice(0, e.target.selectionStart);
        const match = textBeforeCursor.match(/\[\[([^\]]*)$/);
        if (match) {
           setWikilinkQuery(match[1]);
           setWikilinkIndex(0);
        } else {
           setShowWikilinks(false);
        }
      }
  };

  const emitSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const isCollapsed = selectionStart === selectionEnd;
    
    if (isCollapsed) {
        setSelectionPos(null);
        setSelectedText('');
    } else {
        const selected = value.slice(Math.min(selectionStart, selectionEnd), Math.max(selectionStart, selectionEnd)).trim();
        setSelectedText(selected);
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0) {
               setSelectionPos({ x: rect.left + rect.width / 2, y: rect.top });
            } else {
               const taRect = textarea.getBoundingClientRect();
               setSelectionPos({ x: taRect.left + taRect.width / 2, y: taRect.top + 60 });
            }
        }
        window.dispatchEvent(new CustomEvent('kura:editor-selection', { detail: selected }));
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (ghostRef.current) {
        ghostRef.current.scrollTop = e.currentTarget.scrollTop;
        ghostRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  
  const onWikilinkSelect = (targetNoteId: number, targetTitle: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, value } = textarea;
    
    // Replace the [[query... with [[title]]
    const textBeforeCursor = value.slice(0, selectionStart);
    const textAfterCursor = value.slice(selectionStart);
    
    const lastBracketIdx = textBeforeCursor.lastIndexOf('[[');
    if (lastBracketIdx !== -1) {
       // If there's already closing brackets right after cursor, we replace them.
       const afterMatch = textAfterCursor.match(/^([^\]]*\]\])/);
       let insertion = `[[${targetTitle}]]`;
       let nextValue = value.slice(0, lastBracketIdx) + insertion + (afterMatch ? textAfterCursor.slice(afterMatch[1].length) : textAfterCursor);
       updateTextWithSelection(nextValue, lastBracketIdx + insertion.length);
    }
    
    setShowWikilinks(false);
  };
  
  const onFlashcard = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(Math.min(selectionStart, selectionEnd), Math.max(selectionStart, selectionEnd));
    const replacement = `**==${selected.trim()}==** :: `;
    const nextValue = value.slice(0, selectionStart) + replacement + value.slice(selectionEnd);
    updateTextWithSelection(nextValue, selectionStart + replacement.length);
    setSelectionPos(null);
  };

  const onHighlight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(Math.min(selectionStart, selectionEnd), Math.max(selectionStart, selectionEnd));
    const replacement = `==${selected}==`;
    const nextValue = value.slice(0, selectionStart) + replacement + value.slice(selectionEnd);
    updateTextWithSelection(nextValue, selectionStart + replacement.length);
    setSelectionPos(null);
  };

  const openFlashcardReview = () => {
    window.dispatchEvent(
      new CustomEvent('kura:open-flashcards', {
        detail: { noteId: note?.id ?? noteId }
      })
    );
  };
  
  const renderGhostText = () => {
    // Ensuring a zero-width space is present for empty lines so they take up 1 line-height
    return text.split('\n').map((line, i) => {
      let content: React.ReactNode = line || '\u200B';
      let fontWeight = 400;
      let color = 'transparent';
      let backgroundColor = 'transparent';
      let gutterIcon = null;
      const smartMarker = smartMarkers.find((marker) => marker.lineIndex === i);

      if (line.match(/^#{1,6}\s/)) {
        fontWeight = 600;
        color = 'rgba(236, 238, 242, 0.4)'; // slightly thicker layer for bolder text effect under normal text
      }
      if (line.includes('::') || smartMarker) {
        backgroundColor = 'var(--color-accent-dim)'; // subtle teal tint
        gutterIcon = (
          <span style={{ position: 'absolute', left: '-20px', fontSize: '11px', color: 'var(--color-accent)', opacity: 0.85, userSelect: 'none' }}>
            ⬡
          </span>
        );
      }

      if (smartMarker) {
        content = (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--color-accent-bright)', opacity: 0.8 }}>{line || '\u200B'}</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '1px 6px',
                borderRadius: '999px',
                color: 'var(--color-accent-bright)',
                background: 'rgba(111, 126, 168, 0.12)',
                fontSize: 11,
                letterSpacing: '0.01em'
              }}
            >
              ⬡ {smartMarker.label}
            </span>
          </span>
        );
      }
      
      // highlight wikilinks rendering logic
      if (typeof content === 'string' && content.includes('[[')) {
        const parts = content.split(/(\[\[.*?\]\])/g);
        content = parts.map((p, j) => {
          if (p.startsWith('[[') && p.endsWith(']]')) {
            return <span key={j} style={{ borderBottom: '1.5px dotted rgba(255,255,255,0.4)', paddingBottom: 1 }}>{p}</span>;
          }
          return p;
        });
      }

      return (
        <div key={i} style={{ position: 'relative', minHeight: '1.8em', backgroundColor, fontWeight, color }}>
          {gutterIcon}
          {content}
        </div>
      );
    });
  };

  const cfg = toolbarConfig;

  return (
    <section
      ref={editorRootRef}
      style={{
        height: '100%',
        display: 'flex',
        position: 'relative',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        padding: cfg?.position === 'left'
          ? 'var(--spacing-lg) var(--spacing-xl) var(--spacing-lg) calc(var(--spacing-xl) + 48px)'
          : 'var(--spacing-lg) var(--spacing-xl)'
      }}
    >
      {cfg && cfg.position !== 'off' && (
        <FormattingToolbar
          noteId={noteId}
          position={cfg.position}
          autoHide={cfg.autoHide}
          peekEnabled={cfg.peekEnabled}
          peekDurationMs={cfg.peekDurationMs}
          peekFadeInMs={cfg.peekFadeInMs}
          peekFadeOutMs={cfg.peekFadeOutMs}
          hoverShowMs={cfg.hoverShowMs}
          hoverHideMs={cfg.hoverHideMs}
          enabledTools={cfg.enabledTools}
          onEnabledToolsChange={onToolbarEnabledToolsChange}
        />
      )}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={flushSave}
          placeholder="Note title"
          style={{
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 0',
            flex: 1,
            background: 'transparent',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: -0.2,
            color: 'rgba(236, 238, 242, 0.88)',
            outline: 'none'
          }}
        />
      </div>
      
      <div style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
        {/* Ghost Layer Background */}
        <div 
          ref={ghostRef}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            padding: 'var(--spacing-sm) 0 var(--spacing-lg)',
            lineHeight: 1.8,
            fontSize: 15,
            fontFamily: 'var(--font-note)',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            color: 'transparent',
            pointerEvents: 'none',
            overflow: 'hidden'
          }}
          aria-hidden="true"
        >
          {renderGhostText()}
        </div>

        {/* Real Textarea superimposed over Ghost layer */}
        <textarea
          id="scholr-main-editor"
          ref={textareaRef}
          autoFocus
          value={text}
          onChange={handleTextChange}
          onScroll={handleScroll}
          onMouseUp={emitSelection}
          onKeyUp={emitSelection}
          onBlur={flushSave}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholderHint(text.length)}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%',
            height: '100%',
            padding: 'var(--spacing-sm) 0 var(--spacing-lg)',
            border: 'none',
            outline: 'none',
            resize: 'none',
            lineHeight: 1.8,
            fontSize: 15,
            background: 'transparent',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-note)',
            caretColor: 'var(--color-text)'
          }}
        />
      </div>
      
      {/* The Flashcard Status Bar */}
      <div className="editor-status-bar" style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--color-text-muted)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
        <span>{text.split(/\s+/).filter(Boolean).length} words</span>
        <span>·</span>
        <span>{Math.ceil(text.split(/\s+/).filter(Boolean).length / 200)} min read</span>
        <span>·</span>
        <span>{text.split('\n').filter((l) => l.includes('::')).length + smartMarkers.length} cards on this note</span>
        <span>·</span>
        <button
          type="button"
          onClick={openFlashcardReview}
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 999,
            background: 'rgba(111, 126, 168, 0.12)',
            color: 'var(--color-accent-bright)',
            fontSize: 12,
            lineHeight: 1,
            padding: '6px 10px'
          }}
        >
          Review cards
        </button>
        {autoCreateUndo ? (
          <>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                void undoAutoCreatedCards();
              }}
              style={{
                border: '1px solid var(--color-warning)',
                borderRadius: 999,
                background: 'var(--color-warning-dim)',
                color: 'var(--color-warning)',
                fontSize: 12,
                lineHeight: 1,
                padding: '6px 10px'
              }}
            >
              Undo auto-card
            </button>
          </>
        ) : null}
        {status && <><span>·</span><span className="save-status" style={{ color: 'var(--color-success)' }}>{status}</span></>}
      </div>

      {showSlashMenu && slashMenuPosition ? (
        <div
          style={{
            position: 'absolute',
            top: slashMenuPosition.y,
            left: slashMenuPosition.x,
            minWidth: 220,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-panel-elevated)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            zIndex: 15
          }}
        >
          {SLASH_COMMANDS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applySlashCommand(item)}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                padding: '8px 10px',
                cursor: 'pointer',
                color: 'var(--color-text)',
                background: index === slashIndex ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                fontSize: 13
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      
      {showWikilinks && (
          <WikilinkPopover 
             query={wikilinkQuery} 
             position={wikilinkPos} 
             onSelect={onWikilinkSelect} 
             onClose={() => setShowWikilinks(false)} 
             selectedIndex={wikilinkIndex} 
          />
      )}

      {showSmartPalette && smartPaletteContext ? (
        <SmartColonPalette
          context={smartPaletteContext}
          position={smartPalettePosition}
          actions={smartPaletteActions}
          selectedIndex={smartPaletteIndex}
          onSelect={(action) => { void handleSmartPaletteSelect(action); }}
          onClose={closeSmartPalette}
        />
      ) : null}
      
      <SelectionToolbar 
         selectedText={selectedText} 
         position={selectionPos} 
         onFlashcard={onFlashcard} 
         onHighlight={onHighlight} 
      />
    </section>
  );
}
