import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import NavigatorRail from './components/layout/NavigatorRail';
import TabBar, { NoteTab } from './components/layout/TabBar';
import DualPane from './components/notes/DualPane';
import FolderCanvas from './components/notes/FolderCanvas';
import { RightPanel } from './components/tools/toolRegistry';
import Icon from './components/ui/Icon';
import { AppMode, CanvasLayoutMode, ClassItem, FolderItem, NavPlacement, Note, QuickActionsMode, TabPlacement } from './types';

const TAB_PLACEMENT_KEY = 'kura.tab.placement';
const APP_MODE_KEY = 'kura.app.mode';
const LAST_OPEN_NOTE_KEY = 'kura.last.open.note';
const NAV_PLACEMENT_KEY = 'kura.nav.placement';
const CANVAS_LAYOUT_MODE_KEY = 'kura.canvas.layout.mode';
const QUICK_ACTIONS_MODE_KEY = 'kura.quick.actions.mode';
const COMPACT_RAIL_KEY = 'kura.nav.compact';

function loadTabPlacement(): TabPlacement {
  const value = window.localStorage.getItem(TAB_PLACEMENT_KEY);
  if (value === 'left') {
    return 'left';
  }
  return 'top';
}

function loadAppMode(): AppMode {
  const value = window.localStorage.getItem(APP_MODE_KEY);
  if (value === 'study' || value === 'organize') {
    return value;
  }
  return 'focus';
}

function loadNavPlacement(): NavPlacement {
  return window.localStorage.getItem(NAV_PLACEMENT_KEY) === 'top' ? 'top' : 'left';
}

function loadCanvasLayoutMode(): CanvasLayoutMode {
  const value = window.localStorage.getItem(CANVAS_LAYOUT_MODE_KEY);
  if (value === 'column' || value === 'free') {
    return value;
  }
  return 'grid';
}

function loadQuickActionsMode(): QuickActionsMode {
  return window.localStorage.getItem(QUICK_ACTIONS_MODE_KEY) === 'island' ? 'island' : 'rail';
}

function loadCompactRailEnabled(): boolean {
  return window.localStorage.getItem(COMPACT_RAIL_KEY) === '1';
}

export default function App() {
  const [tags, setTags] = useState<ClassItem[]>([]);
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [tabs, setTabs] = useState<NoteTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [folderNotes, setFolderNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [rightPanel, setRightPanel] = useState<RightPanel>('study');
  const [tabPlacement, setTabPlacement] = useState<TabPlacement>(loadTabPlacement);
  const [appMode, setAppMode] = useState<AppMode>(loadAppMode);
  const [navPlacement, setNavPlacement] = useState<NavPlacement>(loadNavPlacement);
  const [canvasLayoutMode, setCanvasLayoutMode] = useState<CanvasLayoutMode>(loadCanvasLayoutMode);
  const [quickActionsMode, setQuickActionsMode] = useState<QuickActionsMode>(loadQuickActionsMode);
  const [compactRailEnabled, setCompactRailEnabled] = useState(loadCompactRailEnabled);
  const [isRailPeekOpen, setIsRailPeekOpen] = useState(false);
  const [isIslandOpen, setIsIslandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [islandIntent, setIslandIntent] = useState<'note' | 'folder' | 'tag' | 'note-with-folder'>('note');
  const [islandDescription, setIslandDescription] = useState('');
  const [islandUseTag, setIslandUseTag] = useState(true);
  const [islandUseFolder, setIslandUseFolder] = useState(false);
  const [islandNoteTitle, setIslandNoteTitle] = useState('');
  const [islandFolderName, setIslandFolderName] = useState('');
  const [islandTagName, setIslandTagName] = useState('');
  const [islandTagColor, setIslandTagColor] = useState('#6f7ea8');
  const [islandTagId, setIslandTagId] = useState<number | null>(null);
  const [islandFolderId, setIslandFolderId] = useState<number | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const attemptedInstantCapture = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(TAB_PLACEMENT_KEY, tabPlacement);
  }, [tabPlacement]);

  useEffect(() => {
    window.localStorage.setItem(APP_MODE_KEY, appMode);
  }, [appMode]);

  useEffect(() => {
    window.localStorage.setItem(NAV_PLACEMENT_KEY, navPlacement);
  }, [navPlacement]);

  useEffect(() => {
    window.localStorage.setItem(CANVAS_LAYOUT_MODE_KEY, canvasLayoutMode);
  }, [canvasLayoutMode]);

  useEffect(() => {
    window.localStorage.setItem(QUICK_ACTIONS_MODE_KEY, quickActionsMode);
  }, [quickActionsMode]);

  useEffect(() => {
    window.localStorage.setItem(COMPACT_RAIL_KEY, compactRailEnabled ? '1' : '0');
  }, [compactRailEnabled]);

  useEffect(() => {
    if (quickActionsMode !== 'island') {
      setIsIslandOpen(false);
    }
  }, [quickActionsMode]);

  useEffect(() => {
    invoke<ClassItem[]>('list_classes')
      .then((items) => {
        setTags(items);
        if (!activeClassId && items.length > 0 && islandTagId === null) {
          setIslandTagId(items[0].id);
        }
      })
      .catch(() => setTags([]));
  }, [dataVersion]);

  useEffect(() => {
    invoke<FolderItem[]>('list_folders', { classId: activeClassId ?? null })
      .then((items) => {
        setFolders(items);
        if (!activeFolderId || !items.find((item) => item.id === activeFolderId)) {
          setActiveFolderId(items[0]?.id ?? null);
        }
      })
      .catch(() => setFolders([]));
  }, [activeClassId, dataVersion]);

  useEffect(() => {
    if (!activeFolderId) {
      setFolderNotes([]);
      return;
    }

    invoke<Note[]>('list_notes_by_folder', {
      classId: activeClassId ?? null,
      folderId: activeFolderId
    })
      .then(setFolderNotes)
      .catch(() => setFolderNotes([]));
  }, [activeClassId, activeFolderId, activeTabId, dataVersion]);

  const activeFolderName = useMemo(() => {
    if (!activeFolderId) {
      return 'Folder';
    }
    return folders.find((folder) => folder.id === activeFolderId)?.name ?? 'Folder';
  }, [activeFolderId, folders]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  function handleOpenNote(note: Note) {
    const existing = tabs.find((tab) => tab.noteId === note.id);
    setActiveFolderId(note.folderId ?? activeFolderId);
    setActiveNoteId(note.id);

    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const created: NoteTab = {
      id: `note-${note.id}`,
      noteId: note.id,
      title: note.title || 'Untitled'
    };
    setTabs((prev) => [...prev, created]);
    setActiveTabId(created.id);
    window.localStorage.setItem(LAST_OPEN_NOTE_KEY, String(note.id));
  }

  function handleSelectTab(tabId: string) {
    setActiveTabId(tabId);
    const tab = tabs.find((item) => item.id === tabId);
    setActiveNoteId(tab?.noteId ?? null);
  }

  function handleCloseTab(tabId: string) {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    const nextTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(nextTabs);

    if (activeTabId !== tabId) {
      return;
    }

    const fallback = nextTabs[index] ?? nextTabs[index - 1] ?? null;
    setActiveTabId(fallback?.id ?? null);
    setActiveNoteId(fallback?.noteId ?? null);
  }

  function handleNotesDeleted(noteIds: number[]) {
    if (noteIds.length === 0) {
      return;
    }

    setTabs((prev) => prev.filter((tab) => !noteIds.includes(tab.noteId)));

    if (activeNoteId && noteIds.includes(activeNoteId)) {
      setActiveNoteId(null);
      setActiveTabId(null);
    }
  }

  async function createTag(name: string, color?: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    try {
      const created = await invoke<ClassItem>('create_class', {
        name: trimmed,
        color: color ?? '#6f7ea8'
      });

      setActiveClassId(created.id);
      setActiveFolderId(null);
      setIslandTagId(created.id);
      setDataVersion((v) => v + 1);
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function handleCreateClass() {
    const name = window.prompt('Tag name');
    if (!name || !name.trim()) {
      return;
    }
    await createTag(name);
  }

  async function createFolder(name: string, classIdOverride?: number | null): Promise<FolderItem | null> {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const created = await invoke<FolderItem>('create_folder', {
        classId: classIdOverride !== undefined ? classIdOverride : activeClassId ?? null,
        name: trimmed
      });
      setActiveFolderId(created.id);
      setIslandFolderId(created.id);
      setDataVersion((v) => v + 1);
      return created;
    } catch (error) {
      window.alert(String(error));
      return null;
    }
  }

  async function handleCreateFolder() {
    const name = window.prompt('Folder name');
    if (!name || !name.trim()) {
      return;
    }
    await createFolder(name);
  }

  async function createNote(title: string, classIdOverride?: number | null, folderIdOverride?: number | null) {
    const safeTitle = title.trim() || `Quick Note ${new Date().toLocaleDateString()}`;
    try {
      const created = await invoke<Note>('save_note', {
        classId: classIdOverride !== undefined ? classIdOverride : activeClassId ?? null,
        folderId: folderIdOverride !== undefined ? folderIdOverride : activeFolderId ?? null,
        title: safeTitle,
        rawContent: ''
      });
      handleOpenNote(created);
      setDataVersion((v) => v + 1);
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function handleCreateFromIsland() {
    const title = islandNoteTitle.trim();
    const selectedTagId = islandUseTag ? islandTagId : null;
    const selectedFolderId = islandUseFolder ? islandFolderId : null;

    if (islandIntent === 'note') {
      await createNote(title, selectedTagId, selectedFolderId);
    }

    if (islandIntent === 'folder') {
      await createFolder(title || islandFolderName, selectedTagId);
    }

    if (islandIntent === 'tag') {
      await createTag(title || islandTagName, islandTagColor);
    }

    if (islandIntent === 'note-with-folder') {
      const nextFolderName = islandFolderName.trim() || (title ? `${title} Folder` : 'New Folder');
      const createdFolder = await createFolder(nextFolderName, selectedTagId);
      await createNote(title, selectedTagId, createdFolder?.id ?? null);
    }

    setIslandDescription('');
    setIslandNoteTitle('');
    setIslandFolderName('');
    setIslandTagName('');
    setIsIslandOpen(false);
  }

  async function handleCreateNote() {
    await createNote(`Quick Note ${new Date().toLocaleDateString()}`);
  }

  async function handleRenameActiveTag() {
    if (!activeClassId) {
      return;
    }
    const current = tags.find((tag) => tag.id === activeClassId);
    if (!current) {
      return;
    }
    const nextName = window.prompt('Rename tag', current.name);
    if (!nextName || !nextName.trim()) {
      return;
    }
    try {
      await invoke('update_class', {
        classId: current.id,
        name: nextName.trim(),
        color: current.color
      });
      setDataVersion((v) => v + 1);
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function handleRenameActiveFolder() {
    if (!activeFolderId) {
      return;
    }
    const current = folders.find((folder) => folder.id === activeFolderId);
    if (!current) {
      return;
    }
    const nextName = window.prompt('Rename folder', current.name);
    if (!nextName || !nextName.trim()) {
      return;
    }
    try {
      await invoke('rename_folder', {
        folderId: current.id,
        name: nextName.trim()
      });
      setDataVersion((v) => v + 1);
    } catch (error) {
      window.alert(String(error));
    }
  }

  function triggerEditorAction(action: 'heading' | 'bullet' | 'quote' | 'table' | 'image' | 'code' | 'flashcard' | 'indent' | 'outdent') {
    window.dispatchEvent(new CustomEvent('kura:editor-action', { detail: action }));
  }

  function flushEditorNow() {
    window.dispatchEvent(new Event('kura:editor-flush'));
  }

  useEffect(() => {
    if (attemptedInstantCapture.current || activeTabId) {
      return;
    }

    if (!activeFolderId) {
      attemptedInstantCapture.current = true;
      return;
    }

    if (folderNotes.length > 0) {
      const rememberedId = Number(window.localStorage.getItem(LAST_OPEN_NOTE_KEY));
      const remembered = folderNotes.find((note) => note.id === rememberedId);
      const mostRecent = [...folderNotes].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      )[0];
      const next = remembered ?? mostRecent;
      if (next) {
        handleOpenNote(next);
      }
      attemptedInstantCapture.current = true;
      return;
    }

    invoke<Note>('save_note', {
      classId: activeClassId ?? null,
      folderId: activeFolderId,
      title: `Quick Note ${new Date().toLocaleDateString()}`,
      rawContent: ''
    })
      .then((created) => {
        handleOpenNote(created);
        setDataVersion((v) => v + 1);
      })
      .catch(() => {
        // Keep the shell stable even when quick-note bootstrapping fails.
      })
      .finally(() => {
        attemptedInstantCapture.current = true;
      });
  }, [activeClassId, activeFolderId, activeTabId, folderNotes]);

  const focusAndStudyShell =
    tabPlacement === 'top' ? (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {appMode === 'study' && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            placement={tabPlacement}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
          />
        )}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DualPane
            noteId={activeTab?.noteId ?? null}
            classId={activeClassId}
            rightPanel={rightPanel}
            mode={appMode}
          />
        </div>
      </div>
    ) : (
      <div style={{ display: 'flex', height: '100%' }}>
        {appMode === 'study' && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            placement={tabPlacement}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <DualPane
            noteId={activeTab?.noteId ?? null}
            classId={activeClassId}
            rightPanel={rightPanel}
            mode={appMode}
          />
        </div>
      </div>
    );

  const organizeShell = (
    <FolderCanvas
      classId={activeClassId}
      folderId={activeFolderId}
      folderName={activeFolderName}
      notes={folderNotes}
      folders={folders}
      appMode={appMode}
      isSettingsOpen={isSettingsOpen}
      onSetAppMode={setAppMode}
      onToggleSettings={() => setIsSettingsOpen((v) => !v)}
      layoutMode={canvasLayoutMode}
      onCycleLayoutMode={() =>
        setCanvasLayoutMode((current) =>
          current === 'grid' ? 'column' : current === 'column' ? 'free' : 'grid'
        )
      }
      onOpenNote={handleOpenNote}
      onNotesMutated={() => setDataVersion((v) => v + 1)}
      onNotesDeleted={handleNotesDeleted}
    />
  );

  const workspace = appMode === 'organize' ? organizeShell : focusAndStudyShell;

  const shellStyle =
    navPlacement === 'left'
      ? { display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' as const }
      : { display: 'flex', flexDirection: 'column' as const, height: '100vh', overflow: 'hidden' };

  const isCompactRailActive = navPlacement === 'left' && compactRailEnabled;
  const isRailVisible = !isCompactRailActive || isRailPeekOpen;

  const railWrapperStyle = isCompactRailActive
    ? {
        width: isRailVisible ? 260 : 0,
        overflow: 'hidden',
        transition: 'width 180ms ease',
        zIndex: 25
      }
    : {
        position: 'relative' as const,
        zIndex: 10
      };

  return (
    <div style={shellStyle}>
      {navPlacement === 'left' && isCompactRailActive && (
        <div
          onMouseEnter={() => setIsRailPeekOpen(true)}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, zIndex: 30 }}
        />
      )}
      {navPlacement === 'left' ? (
        <div
          style={railWrapperStyle}
          onMouseEnter={() => {
            if (isCompactRailActive) {
              setIsRailPeekOpen(true);
            }
          }}
          onMouseLeave={() => {
            if (isCompactRailActive) {
              setIsRailPeekOpen(false);
            }
          }}
        >
          <NavigatorRail
            placement={navPlacement}
            quickActionsMode={quickActionsMode}
            activeClassId={activeClassId}
            activeFolderId={activeFolderId}
            activeNoteId={activeNoteId}
            onSelectClass={setActiveClassId}
            onOpenIsland={() => setIsIslandOpen(true)}
            onCreateClass={handleCreateClass}
            onCreateFolder={handleCreateFolder}
            onCreateNote={handleCreateNote}
            onSelectFolder={(folderId) => {
              setActiveFolderId(folderId);
              setActiveNoteId(null);
              setActiveTabId(null);
            }}
            onOpenNote={handleOpenNote}
          />
        </div>
      ) : (
        <NavigatorRail
          placement={navPlacement}
          quickActionsMode={quickActionsMode}
          activeClassId={activeClassId}
          activeFolderId={activeFolderId}
          activeNoteId={activeNoteId}
          onSelectClass={setActiveClassId}
          onOpenIsland={() => setIsIslandOpen(true)}
          onCreateClass={handleCreateClass}
          onCreateFolder={handleCreateFolder}
          onCreateNote={handleCreateNote}
          onSelectFolder={(folderId) => {
            setActiveFolderId(folderId);
            setActiveNoteId(null);
            setActiveTabId(null);
          }}
          onOpenNote={handleOpenNote}
        />
      )}
      <main style={{ flex: 1, background: 'var(--color-panel)', position: 'relative' }}>
        {appMode !== 'organize' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 'var(--spacing-md)',
              transform: 'translateY(-50%)',
              zIndex: 20,
              display: 'grid',
              gap: 8,
              padding: 8,
              borderRadius: 16,
              border: '1px solid var(--color-border)',
              background: 'rgba(19, 20, 23, 0.92)',
              backdropFilter: 'blur(6px)'
            }}
          >
          <button
            onClick={() => {
              flushEditorNow();
              setAppMode('focus');
            }}
            title="Focus"
            style={{
              borderRadius: 10,
              width: 34,
              height: 34,
              padding: 0,
              background: appMode === 'focus' ? 'rgba(111, 126, 168, 0.22)' : 'rgba(255, 255, 255, 0.03)',
              color: 'var(--color-text)',
              borderColor: appMode === 'focus' ? 'rgba(111, 126, 168, 0.4)' : 'var(--color-border)'
            }}
          >
            <Icon name="focus" />
          </button>
          <button
            onClick={() => {
              flushEditorNow();
              setAppMode('study');
            }}
            title="Study"
            style={{
              borderRadius: 10,
              width: 34,
              height: 34,
              padding: 0,
              background: appMode === 'study' ? 'rgba(111, 126, 168, 0.22)' : 'rgba(255, 255, 255, 0.03)',
              color: 'var(--color-text)',
              borderColor: appMode === 'study' ? 'rgba(111, 126, 168, 0.4)' : 'var(--color-border)'
            }}
          >
            <Icon name="study" />
          </button>
          <button
            onClick={() => {
              flushEditorNow();
              setAppMode('organize');
            }}
            title="Organize"
            style={{
              borderRadius: 10,
              width: 34,
              height: 34,
              padding: 0,
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)'
            }}
          >
            <Icon name="organize" />
          </button>
          <button
            onClick={() => {
              flushEditorNow();
              if (rightPanel === 'flashcards') {
                setRightPanel('study');
                return;
              }
              setAppMode('study');
              setRightPanel('flashcards');
            }}
            title={rightPanel === 'study' ? 'Switch to flashcards' : 'Switch to study'}
            style={{
              borderRadius: 10,
              width: 34,
              height: 34,
              padding: 0,
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)'
            }}
          >
            <Icon name={rightPanel === 'study' ? 'study' : 'flashcards'} />
          </button>
          <button
            onClick={() => setIsSettingsOpen((v) => !v)}
            title="Settings"
            style={{
              borderRadius: 10,
              width: 34,
              height: 34,
              padding: 0,
              background: isSettingsOpen ? 'rgba(111, 126, 168, 0.22)' : 'rgba(255, 255, 255, 0.03)',
              color: 'var(--color-text)',
              borderColor: isSettingsOpen ? 'rgba(111, 126, 168, 0.4)' : 'var(--color-border)'
            }}
          >
            <Icon name="settings" />
          </button>

          <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 4px' }} />

          <button
            onClick={() => triggerEditorAction('heading')}
            title="Heading"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="heading" />
          </button>
          <button
            onClick={() => triggerEditorAction('bullet')}
            title="Bulleted list"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="list" />
          </button>
          <button
            onClick={() => triggerEditorAction('quote')}
            title="Block quote"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="quote" />
          </button>
          <button
            onClick={() => triggerEditorAction('table')}
            title="Insert table"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="table" />
          </button>
          <button
            onClick={() => triggerEditorAction('image')}
            title="Insert image"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="image" />
          </button>
          <button
            onClick={() => triggerEditorAction('code')}
            title="Insert code block"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="code" />
          </button>
          <button
            onClick={() => triggerEditorAction('flashcard')}
            title="Insert flashcard block"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="flashcards" />
          </button>
          <button
            onClick={() => triggerEditorAction('indent')}
            title="Indent"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="indent" />
          </button>
          <button
            onClick={() => triggerEditorAction('outdent')}
            title="Outdent"
            style={{ borderRadius: 10, width: 34, height: 34, padding: 0, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Icon name="outdent" />
          </button>
          </div>
        )}
        {quickActionsMode === 'island' && isIslandOpen && (
          <div
            style={{
              position: 'absolute',
              top: '31%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 34,
              width: 'min(900px, calc(100% - 24px))',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.14)',
              background: 'rgba(19, 21, 28, 0.98)',
              boxShadow: '0 18px 50px rgba(0, 0, 0, 0.45)',
              padding: 12,
              display: 'grid',
              gap: 10,
              backdropFilter: 'blur(14px)'
            }}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                value={islandNoteTitle}
                onChange={(e) => setIslandNoteTitle(e.target.value)}
                placeholder="Name your note, folder, or tag"
                style={{
                  height: 44,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: 24,
                  color: 'var(--color-text)'
                }}
              />
              <input
                value={islandDescription}
                onChange={(e) => setIslandDescription(e.target.value)}
                placeholder="Description or next step"
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255,255,255,0.02)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIslandIntent('note')}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: islandIntent === 'note' ? 'rgba(111, 126, 168, 0.24)' : 'rgba(255,255,255,0.03)',
                    borderColor: islandIntent === 'note' ? 'rgba(111, 126, 168, 0.38)' : 'var(--color-border)'
                  }}
                >
                  <Icon name="note" size={14} /> Note
                </button>
                <button
                  onClick={() => setIslandIntent('folder')}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: islandIntent === 'folder' ? 'rgba(111, 126, 168, 0.24)' : 'rgba(255,255,255,0.03)',
                    borderColor: islandIntent === 'folder' ? 'rgba(111, 126, 168, 0.38)' : 'var(--color-border)'
                  }}
                >
                  <Icon name="folder" size={14} /> Folder
                </button>
                <button
                  onClick={() => setIslandIntent('note-with-folder')}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: islandIntent === 'note-with-folder' ? 'rgba(111, 126, 168, 0.24)' : 'rgba(255,255,255,0.03)',
                    borderColor: islandIntent === 'note-with-folder' ? 'rgba(111, 126, 168, 0.38)' : 'var(--color-border)'
                  }}
                >
                  <Icon name="folder-plus" size={14} /> Note in New Folder
                </button>
                <button
                  onClick={() => setIslandIntent('tag')}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: islandIntent === 'tag' ? 'rgba(111, 126, 168, 0.24)' : 'rgba(255,255,255,0.03)',
                    borderColor: islandIntent === 'tag' ? 'rgba(111, 126, 168, 0.38)' : 'var(--color-border)'
                  }}
                >
                  <Icon name="sparkles" size={14} /> Tag
                </button>
              </div>
              <button onClick={() => setIsIslandOpen(false)} title="Close" style={{ width: 34, height: 34, padding: 0, borderRadius: 999 }}>
                <Icon name="x" />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10, border: '1px solid var(--color-border)', borderRadius: 12, padding: 10 }}>
              <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIslandUseTag((v) => !v)}
                  style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 9,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: islandUseTag ? 'rgba(58, 148, 99, 0.22)' : 'rgba(255,255,255,0.03)',
                    borderColor: islandUseTag ? 'rgba(58, 148, 99, 0.45)' : 'var(--color-border)'
                  }}
                >
                  <Icon name="sparkles" size={13} /> Tag Link
                </button>
                <button
                  onClick={() => setIslandUseFolder((v) => !v)}
                  disabled={islandIntent === 'folder' || islandIntent === 'tag' || islandIntent === 'note-with-folder'}
                  style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 9,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: islandUseFolder ? 'rgba(58, 148, 99, 0.22)' : 'rgba(255,255,255,0.03)',
                    borderColor: islandUseFolder ? 'rgba(58, 148, 99, 0.45)' : 'var(--color-border)',
                    opacity: islandIntent === 'folder' || islandIntent === 'tag' || islandIntent === 'note-with-folder' ? 0.5 : 1
                  }}
                >
                  <Icon name="folder" size={13} /> Existing Folder
                </button>
              </div>

              {islandUseTag && (
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: islandIntent === 'tag' ? '1fr auto' : '1fr' }}>
                  <select
                    value={islandTagId ?? ''}
                    onChange={(e) => setIslandTagId(e.target.value ? Number(e.target.value) : null)}
                    style={{ height: 34, borderRadius: 10, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)' }}
                  >
                    <option value="">No tag</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                  {islandIntent === 'tag' && (
                    <input
                      type="color"
                      value={islandTagColor}
                      onChange={(e) => setIslandTagColor(e.target.value)}
                      title="Tag color"
                      style={{ height: 34, width: 42, borderRadius: 10, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)', padding: 4 }}
                    />
                  )}
                </div>
              )}

              {islandUseFolder && islandIntent === 'note' && (
                <select
                  value={islandFolderId ?? ''}
                  onChange={(e) => setIslandFolderId(e.target.value ? Number(e.target.value) : null)}
                  style={{ height: 34, borderRadius: 10, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              )}

              {islandIntent === 'note-with-folder' && (
                <input
                  value={islandFolderName}
                  onChange={(e) => setIslandFolderName(e.target.value)}
                  placeholder="New folder name"
                  style={{ height: 34, padding: '0 10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)' }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkles" size={12} />
                  {islandIntent === 'note' && 'Create a note fast, then open it immediately.'}
                  {islandIntent === 'folder' && 'Create a folder for collecting notes.'}
                  {islandIntent === 'note-with-folder' && 'Create a folder and the first note in one flow.'}
                  {islandIntent === 'tag' && 'Create a tag to organize your workspace.'}
                </div>
                <div style={{ display: 'inline-flex', gap: 8 }}>
                  <button onClick={() => setIsIslandOpen(false)} style={{ height: 34, borderRadius: 10, padding: '0 12px' }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleCreateFromIsland()}
                    style={{
                      height: 34,
                      borderRadius: 10,
                      padding: '0 14px',
                      display: 'inline-flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(111, 126, 168, 0.24)',
                      borderColor: 'rgba(111, 126, 168, 0.4)'
                    }}
                  >
                    <Icon name="plus" size={14} />
                    {islandIntent === 'note' && 'Create Note'}
                    {islandIntent === 'folder' && 'Create Folder'}
                    {islandIntent === 'note-with-folder' && 'Create Note + Folder'}
                    {islandIntent === 'tag' && 'Create Tag'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {isSettingsOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(var(--spacing-md) + 48px)',
              right: 'var(--spacing-lg)',
              zIndex: 21,
              width: 230,
              padding: 10,
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'rgba(18, 19, 22, 0.96)',
              display: 'grid',
              gap: 8
            }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Navigation</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setNavPlacement('left')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  background: navPlacement === 'left' ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)'
                }}
              >
                <Icon name="layout-left" size={14} /> Zen
              </button>
              <button
                onClick={() => setNavPlacement('top')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  background: navPlacement === 'top' ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)'
                }}
              >
                <Icon name="layout-top" size={14} /> Chrome
              </button>
            </div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Tabs</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setTabPlacement('top')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  background: tabPlacement === 'top' ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)'
                }}
              >
                <Icon name="layout-top" size={14} /> Top
              </button>
              <button
                onClick={() => setTabPlacement('left')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  background: tabPlacement === 'left' ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)'
                }}
              >
                <Icon name="layout-left" size={14} /> Left
              </button>
            </div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setQuickActionsMode('rail')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  background: quickActionsMode === 'rail' ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)'
                }}
              >
                <Icon name="layout-left" size={14} /> Rail
              </button>
              <button
                onClick={() => setQuickActionsMode('island')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  background: quickActionsMode === 'island' ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)'
                }}
              >
                <Icon name="focus" size={14} /> Island
              </button>
            </div>
            <button
              onClick={() => setCompactRailEnabled((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                background: compactRailEnabled ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="chevron-left" size={14} /> Compact Rail
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{compactRailEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        )}
        {workspace}
      </main>
    </div>
  );
}
