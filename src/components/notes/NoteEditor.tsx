import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDebounce } from '../../hooks/useDebounce';
import { Note } from '../../types';

type SlashCommand = {
  id: 'table' | 'image' | 'code' | 'flashcard';
  label: string;
  snippet: string;
};

type EditorAction =
  | 'heading'
  | 'bullet'
  | 'quote'
  | 'table'
  | 'image'
  | 'code'
  | 'flashcard'
  | 'indent'
  | 'outdent';

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
}

export default function NoteEditor({ noteId, classId }: Props) {
  const [note, setNote] = useState<Note | null>(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debouncedText = useDebounce(text, 3000);
  const debouncedTitle = useDebounce(title, 3000);

  const flushSave = () => {
    if (!note) {
      return;
    }

    if (text === note.rawContent && title === note.title) {
      return;
    }

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
            if (line.startsWith('  ')) {
              return line.slice(2);
            }
            if (line.startsWith('\t')) {
              return line.slice(1);
            }
            if (line.startsWith(' ')) {
              return line.slice(1);
            }
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
    if (!listMatch) {
      return false;
    }

    if (outdent) {
      const indentToRemove = Math.min(2, listMatch[1].length);
      if (indentToRemove === 0) {
        return false;
      }
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
    if (!textarea) {
      return;
    }
    const { selectionStart, selectionEnd, value } = textarea;
    const nextValue = value.slice(0, selectionStart) + snippet + value.slice(selectionEnd);
    updateTextWithSelection(nextValue, selectionStart + snippet.length);
  };

  const applySlashCommand = (command: SlashCommand) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const nextValue = value.slice(0, selectionStart) + command.snippet + value.slice(selectionEnd);
    const cursor = selectionStart + command.snippet.length;
    updateTextWithSelection(nextValue, cursor);
    setShowSlashMenu(false);
  };

  const closeSlashMenu = () => {
    setShowSlashMenu(false);
    setSlashIndex(0);
  };

  useEffect(() => {
    if (!noteId) {
      setNote(null);
      setText('');
      setTitle('');
      closeSlashMenu();
      return;
    }

    invoke<Note>('load_note', { noteId }).then((loaded) => {
      setNote(loaded);
      setText(loaded.rawContent);
      setTitle(loaded.title ?? 'Untitled');
      closeSlashMenu();
    });
  }, [noteId]);

  const isDirty = useMemo(() => {
    if (!note) {
      return false;
    }
    return debouncedText !== note.rawContent || debouncedTitle !== note.title;
  }, [debouncedText, debouncedTitle, note]);

  useEffect(() => {
    if (!note || !isDirty) {
      return;
    }

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
        window.setTimeout(() => setStatus(''), 1200);
      })
      .catch(() => setStatus('Save failed'));
  }, [debouncedText, debouncedTitle]);

  useEffect(() => {
    if (!noteId) {
      return;
    }
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
    function onEditorAction(event: Event) {
      if (!noteId || !(event instanceof CustomEvent)) {
        return;
      }

      const action = event.detail as EditorAction;
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      const { selectionStart, selectionEnd, value } = textarea;

      if (action === 'heading') {
        applyLinePrefix(value, selectionStart, selectionEnd, '# ');
        return;
      }

      if (action === 'bullet') {
        applyLinePrefix(value, selectionStart, selectionEnd, '- ');
        return;
      }

      if (action === 'quote') {
        applyLinePrefix(value, selectionStart, selectionEnd, '> ');
        return;
      }

      if (action === 'table') {
        insertSnippet(SLASH_COMMANDS.find((item) => item.id === 'table')?.snippet ?? '');
        return;
      }

      if (action === 'image') {
        insertSnippet(SLASH_COMMANDS.find((item) => item.id === 'image')?.snippet ?? '');
        return;
      }

      if (action === 'code') {
        insertSnippet(SLASH_COMMANDS.find((item) => item.id === 'code')?.snippet ?? '');
        return;
      }

      if (action === 'flashcard') {
        insertSnippet(SLASH_COMMANDS.find((item) => item.id === 'flashcard')?.snippet ?? '');
        return;
      }

      if (action === 'indent') {
        applyIndent(value, selectionStart, selectionEnd, false);
        return;
      }

      if (action === 'outdent') {
        applyIndent(value, selectionStart, selectionEnd, true);
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
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const isCollapsed = selectionStart === selectionEnd;

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
      return;
    }

    if (!isCollapsed) {
      if (showSlashMenu) {
        closeSlashMenu();
      }
      return;
    }

    if (e.key === '/') {
      const { line } = getCurrentLine(value, selectionStart);
      if (line.trim() === '') {
        e.preventDefault();
        setShowSlashMenu(true);
        setSlashIndex(0);
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

    if (e.key === 'Tab') {
      e.preventDefault();
      const applied = applyIndent(value, selectionStart, selectionEnd, e.shiftKey);
      if (!applied) {
        return;
      }

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

    if (showSlashMenu && e.key.length === 1) {
      closeSlashMenu();
    }
  };

  const emitSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(Math.min(selectionStart, selectionEnd), Math.max(selectionStart, selectionEnd)).trim();
    window.dispatchEvent(new CustomEvent('kura:editor-selection', { detail: selected }));
  };

  return (
    <section
      style={{
        height: '100%',
        display: 'flex',
        position: 'relative',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-lg) var(--spacing-xl)'
      }}
    >
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
        <div style={{ fontSize: 12, minWidth: 70, textAlign: 'right', color: 'var(--color-text-muted)' }}>{status}</div>
      </div>
      <textarea
        ref={textareaRef}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onMouseUp={emitSelection}
        onKeyUp={emitSelection}
        onBlur={flushSave}
        onKeyDown={handleKeyDown}
        placeholder="Write your lecture notes in Markdown..."
        style={{
          flex: 1,
          width: '100%',
          padding: 'var(--spacing-sm) 0 var(--spacing-lg)',
          border: 'none',
          outline: 'none',
          resize: 'none',
          lineHeight: 1.8,
          fontSize: 15,
          background: 'transparent',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-note)'
        }}
      />
      {showSlashMenu ? (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(var(--spacing-lg) + 8px)',
            left: 'var(--spacing-xl)',
            minWidth: 220,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'rgba(11, 12, 15, 0.95)',
            boxShadow: '0 14px 24px rgba(0, 0, 0, 0.35)',
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
    </section>
  );
}
