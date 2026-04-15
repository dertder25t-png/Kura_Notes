import { useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from './utils/invoke';
import { isTauriRuntime } from './utils/invoke';
import NavigatorRail from './components/layout/NavigatorRail';
import ToolRail from './components/layout/ToolRail';
import TabBar, { NoteTab } from './components/layout/TabBar';
import DualPane from './components/notes/DualPane';
import FolderCanvas from './components/notes/FolderCanvas';
import { RightPanel } from './components/tools/toolRegistry';
import Icon from './components/ui/Icon';
import { AppMode, CanvasLayoutMode, ClassItem, FolderItem, NavPlacement, ToolbarConfig, ToolbarToolId, ALL_TOOLBAR_TOOL_IDS, Note, QuickActionsMode, TabPlacement } from './types';

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

const TOOLBAR_CONFIG_KEY = 'kura.toolbar.config';

function loadToolbarConfig(): ToolbarConfig {
  try {
    const raw = window.localStorage.getItem(TOOLBAR_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ToolbarConfig>;
      return {
        position: (['top','left','off'] as const).includes(parsed.position as any) ? parsed.position! : 'top',
        autoHide: parsed.autoHide ?? true,
        peekEnabled: parsed.peekEnabled ?? true,
        peekDurationMs: parsed.peekDurationMs ?? 1500,
        peekFadeInMs: parsed.peekFadeInMs ?? 200,
        peekFadeOutMs: parsed.peekFadeOutMs ?? 500,
        hoverShowMs: parsed.hoverShowMs ?? 150,
        hoverHideMs: parsed.hoverHideMs ?? 300,
        enabledTools: Array.isArray(parsed.enabledTools) ? parsed.enabledTools : [...ALL_TOOLBAR_TOOL_IDS],
      };
    }
  } catch { /* ignore */ }
  return {
    position: 'top',
    autoHide: true,
    peekEnabled: true,
    peekDurationMs: 1500,
    peekFadeInMs: 200,
    peekFadeOutMs: 500,
    hoverShowMs: 150,
    hoverHideMs: 300,
    enabledTools: [...ALL_TOOLBAR_TOOL_IDS],
  };
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
  const [toolbarConfig, setToolbarConfig] = useState<ToolbarConfig>(loadToolbarConfig);

  const [canvasLayoutMode, setCanvasLayoutMode] = useState<CanvasLayoutMode>(loadCanvasLayoutMode);
  const [quickActionsMode, setQuickActionsMode] = useState<QuickActionsMode>(loadQuickActionsMode);
  const [compactRailEnabled, setCompactRailEnabled] = useState(loadCompactRailEnabled);
  const [isRailPeekOpen, setIsRailPeekOpen] = useState(false);
  
  const [sidebarDelayMs, setSidebarDelayMs] = useState(400);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [hoverLevel, setHoverLevel] = useState(0);
  const hoverTimer = useRef<number | null>(null);

  function handleRailEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (hoverLevel === 0) setHoverLevel(1);
    hoverTimer.current = window.setTimeout(() => {
      setHoverLevel(2);
    }, sidebarDelayMs);
  }

  function handleRailLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setHoverLevel(0);
      setIsRailPeekOpen(false);
    }, 150);
  }
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
    window.localStorage.setItem(TOOLBAR_CONFIG_KEY, JSON.stringify(toolbarConfig));
  }, [toolbarConfig]);

  function updateToolbar<K extends keyof ToolbarConfig>(key: K, value: ToolbarConfig[K]) {
    setToolbarConfig((prev) => ({ ...prev, [key]: value }));
  }

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
    invoke<{ alreadyDone: boolean; noteId: number | null }>('bootstrap_first_launch')
      .catch(() => ({ alreadyDone: true, noteId: null }))
      .then((res) => {
        if (!res.alreadyDone && res.noteId) {
          window.localStorage.setItem(LAST_OPEN_NOTE_KEY, String(res.noteId));
        }
        return invoke<ClassItem[]>('list_classes');
      })
      .then((items) => {
        setTags(items);
        if (!activeClassId && items.length > 0 && islandTagId === null) {
          setIslandTagId(items[0].id);
        }
      })
      .catch(() => setTags([]));
  }, [dataVersion]);

  useEffect(() => {
    const refresh = () => setDataVersion((version) => version + 1);

    window.addEventListener('kura:data-invalidated', refresh as EventListener);

    let unlisten: (() => void) | null = null;
    if (isTauriRuntime) {
      void listen('kura:data-invalidated', refresh).then((dispose) => {
        unlisten = dispose;
      });
    }

    return () => {
      window.removeEventListener('kura:data-invalidated', refresh as EventListener);
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    function onOpenFlashcards() {
      setRightPanel('flashcards');
      setAppMode('study');
    }

    window.addEventListener('kura:open-flashcards', onOpenFlashcards as EventListener);
    return () => window.removeEventListener('kura:open-flashcards', onOpenFlashcards as EventListener);
  }, []);

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
            toolbarConfig={toolbarConfig}
            onToolbarEnabledToolsChange={(tools) => updateToolbar('enabledTools', tools)}
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
            toolbarConfig={toolbarConfig}
            onToolbarEnabledToolsChange={(tools) => updateToolbar('enabledTools', tools)}
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
      {navPlacement === 'left' && (
        <div 
          onMouseEnter={handleRailEnter}
          onMouseLeave={handleRailLeave}
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            height: '100%', 
            position: appMode === 'focus' ? 'absolute' : 'relative',
            left: appMode === 'focus' && hoverLevel === 0 ? (isRailPeekOpen ? 0 : -56) : 0,
            zIndex: 40,
            background: 'var(--color-bg)',
            transition: animationsEnabled ? 'left 250ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          }}
        >
          {appMode === 'focus' && hoverLevel === 0 && (
            <div
              onMouseEnter={() => setIsRailPeekOpen(true)}
              style={{ position: 'absolute', left: 56, top: 0, bottom: 0, width: 20, zIndex: 50, cursor: 'w-resize' }}
            />
          )}

          {/* Slim Vertical ToolRail */}
          <div style={{ width: 56, height: '100%' }}>
            <ToolRail
              appMode={appMode}
              onSetAppMode={setAppMode}
              isSettingsOpen={isSettingsOpen}
              onToggleSettings={() => setIsSettingsOpen(v => !v)}
              onCreateNote={handleCreateNote}
              onCreateFolder={handleCreateFolder}
              onCreateClass={handleCreateClass}
            />
          </div>

          {/* Expandable Content Sidebar */}
          <div
            style={{
              width: appMode === 'organize' || appMode === 'study' || hoverLevel === 2 ? 260 : 0,
              overflow: 'hidden',
              background: 'linear-gradient(180deg, #121316 0%, #101114 100%)',
              borderRight: appMode === 'organize' || appMode === 'study' || hoverLevel === 2 ? '1px solid var(--color-border)' : 'none',
              height: '100%',
              display: 'flex',
              transition: animationsEnabled ? 'width 250ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
          >
            <div style={{ width: 260, minWidth: 260, height: '100%' }}>
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
          </div>
        </div>
      )}
      <main style={{ flex: 1, background: 'var(--color-panel)', position: 'relative' }}>
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
          <SettingsModal
            onClose={() => setIsSettingsOpen(false)}
            navPlacement={navPlacement}
            onNavPlacement={setNavPlacement}
            animationsEnabled={animationsEnabled}
            onAnimationsEnabled={setAnimationsEnabled}
            sidebarDelayMs={sidebarDelayMs}
            onSidebarDelayMs={setSidebarDelayMs}
            tabPlacement={tabPlacement}
            onTabPlacement={setTabPlacement}
            quickActionsMode={quickActionsMode}
            onQuickActionsMode={setQuickActionsMode}
            compactRailEnabled={compactRailEnabled}
            onCompactRailEnabled={setCompactRailEnabled}
            toolbarConfig={toolbarConfig}
            onUpdateToolbar={updateToolbar}
          />
        )}
        {workspace}
      </main>
    </div>
  );
}

// ─── SettingsModal ────────────────────────────────────────────────────────────

type SettingsSection = 'layout' | 'sidebar' | 'tabs' | 'toolbar';

interface SettingsModalProps {
  onClose: () => void;
  navPlacement: NavPlacement;
  onNavPlacement: (v: NavPlacement) => void;
  animationsEnabled: boolean;
  onAnimationsEnabled: (v: boolean) => void;
  sidebarDelayMs: number;
  onSidebarDelayMs: (v: number) => void;
  tabPlacement: TabPlacement;
  onTabPlacement: (v: TabPlacement) => void;
  quickActionsMode: QuickActionsMode;
  onQuickActionsMode: (v: QuickActionsMode) => void;
  compactRailEnabled: boolean;
  onCompactRailEnabled: (v: boolean) => void;
  toolbarConfig: ToolbarConfig;
  onUpdateToolbar: <K extends keyof ToolbarConfig>(key: K, value: ToolbarConfig[K]) => void;
}

const SECTION_LABELS: Record<SettingsSection, string> = {
  layout: 'Layout',
  sidebar: 'Sidebar',
  tabs: 'Tabs & Actions',
  toolbar: 'Formatting Toolbar',
};

const SECTION_ICONS: Record<SettingsSection, string> = {
  layout: '⊞',
  sidebar: '▎',
  tabs: '⊟',
  toolbar: '✦',
};

function SettingsModal({
  onClose, navPlacement, onNavPlacement,
  animationsEnabled, onAnimationsEnabled,
  sidebarDelayMs, onSidebarDelayMs,
  tabPlacement, onTabPlacement,
  quickActionsMode, onQuickActionsMode,
  compactRailEnabled, onCompactRailEnabled,
  toolbarConfig, onUpdateToolbar,
}: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>('layout');

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 'min(860px, calc(100vw - 48px))',
          height: 'min(600px, calc(100vh - 80px))',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(145deg, #141518 0%, #111214 100%)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left nav */}
        <div style={{
          width: 200,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          background: 'rgba(255,255,255,0.015)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', padding: '0 10px', marginBottom: 10 }}>
            Settings
          </div>
          {(Object.keys(SECTION_LABELS) as SettingsSection[]).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 9, border: 'none',
                background: section === s ? 'rgba(111,126,168,0.18)' : 'transparent',
                color: section === s ? 'var(--color-text)' : 'var(--color-text-muted)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: section === s ? 500 : 400,
                transition: 'background 120ms, color 120ms',
              }}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: 'center', opacity: 0.8 }}>{SECTION_ICONS[s]}</span>
              {SECTION_LABELS[s]}
            </button>
          ))}

          {/* Close button at bottom */}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 9, border: 'none',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
              transition: 'background 120ms',
            }}
          >
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>✕</span>
            Close
          </button>
        </div>

        {/* Content pane */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>

          {/* ── LAYOUT ─────────────────────────────────────────────────── */}
          {section === 'layout' && (
            <div style={{ display: 'grid', gap: 28 }}>
              <SettingGroup title="Navigation style" description="Choose where the main navigation rail sits.">
                <SegmentedControl
                  options={[
                    { value: 'left', label: 'Zen', icon: '▎' },
                    { value: 'top', label: 'Chrome', icon: '▬' },
                  ]}
                  value={navPlacement}
                  onChange={onNavPlacement}
                />
              </SettingGroup>
            </div>
          )}

          {/* ── SIDEBAR ────────────────────────────────────────────────── */}
          {section === 'sidebar' && (
            <div style={{ display: 'grid', gap: 28 }}>
              <SettingGroup title="Animations" description="Enable or disable motion effects throughout the sidebar.">
                <ToggleRow
                  label="Enable animations"
                  checked={animationsEnabled}
                  onChange={onAnimationsEnabled}
                />
              </SettingGroup>

              <SettingGroup title="Hover delay" description="How long you need to hover before the sidebar expands.">
                <SliderRow
                  label="Delay"
                  value={sidebarDelayMs}
                  min={0} max={1000} step={50}
                  unit="ms"
                  onChange={onSidebarDelayMs}
                />
              </SettingGroup>

              <SettingGroup title="Compact rail" description="When in Zen mode, collapse the rail so only icons show until hovered.">
                <ToggleRow
                  label="Compact rail"
                  checked={compactRailEnabled}
                  onChange={onCompactRailEnabled}
                />
              </SettingGroup>
            </div>
          )}

          {/* ── TABS ───────────────────────────────────────────────────── */}
          {section === 'tabs' && (
            <div style={{ display: 'grid', gap: 28 }}>
              <SettingGroup title="Tab bar position" description="Where note tabs appear when multiple notes are open in Study mode.">
                <SegmentedControl
                  options={[
                    { value: 'top', label: 'Top', icon: '▬' },
                    { value: 'left', label: 'Left', icon: '▎' },
                  ]}
                  value={tabPlacement}
                  onChange={onTabPlacement}
                />
              </SettingGroup>

              <SettingGroup title="Quick actions" description="Choose how the note/folder/tag creation shortcut works.">
                <SegmentedControl
                  options={[
                    { value: 'rail', label: 'Rail buttons', icon: '▎' },
                    { value: 'island', label: 'Island modal', icon: '◈' },
                  ]}
                  value={quickActionsMode}
                  onChange={onQuickActionsMode}
                />
              </SettingGroup>
            </div>
          )}

          {/* ── TOOLBAR ────────────────────────────────────────────────── */}
          {section === 'toolbar' && (
            <div style={{ display: 'grid', gap: 28 }}>
              <SettingGroup title="Toolbar position" description="Where the formatting toolbar appears in the editor.">
                <SegmentedControl
                  options={[
                    { value: 'top', label: 'Top', icon: '▬' },
                    { value: 'left', label: 'Left', icon: '▎' },
                    { value: 'off', label: 'Hidden', icon: '✕' },
                  ]}
                  value={toolbarConfig.position}
                  onChange={(v) => onUpdateToolbar('position', v as ToolbarConfig['position'])}
                />
              </SettingGroup>

              {toolbarConfig.position !== 'off' && (
                <>
                  <SettingGroup title="Auto-hide" description="Toolbar hides while you type and reappears on hover or when idle.">
                    <ToggleRow
                      label="Enable auto-hide"
                      checked={toolbarConfig.autoHide}
                      onChange={(v) => onUpdateToolbar('autoHide', v)}
                    />
                  </SettingGroup>

                  {toolbarConfig.autoHide && (
                    <>
                      <SettingGroup title="Peek after typing" description="When you stop typing, the toolbar briefly appears before hiding again. Disable to only show on hover.">
                        <ToggleRow
                          label="Enable peek"
                          checked={toolbarConfig.peekEnabled}
                          onChange={(v) => onUpdateToolbar('peekEnabled', v)}
                        />
                        {toolbarConfig.peekEnabled && (
                          <div style={{ marginTop: 12 }}>
                            <SliderRow label="Hold for" value={toolbarConfig.peekDurationMs} min={300} max={5000} step={100} unit="ms" onChange={(v) => onUpdateToolbar('peekDurationMs', v)} />
                          </div>
                        )}
                      </SettingGroup>

                      <SettingGroup title="Peek animation" description="Control how fast the toolbar fades in and out during the peek.">
                        <div style={{ display: 'grid', gap: 16 }}>
                          <SliderRow label="Fade in" value={toolbarConfig.peekFadeInMs} min={0} max={800} step={25} unit="ms" onChange={(v) => onUpdateToolbar('peekFadeInMs', v)} />
                          <SliderRow label="Fade out" value={toolbarConfig.peekFadeOutMs} min={0} max={1000} step={25} unit="ms" onChange={(v) => onUpdateToolbar('peekFadeOutMs', v)} />
                        </div>
                      </SettingGroup>

                      <SettingGroup title="Hover animation" description="How fast the toolbar appears and disappears when you hover the toolbar zone.">
                        <div style={{ display: 'grid', gap: 16 }}>
                          <SliderRow label="Show speed" value={toolbarConfig.hoverShowMs} min={0} max={600} step={25} unit="ms" onChange={(v) => onUpdateToolbar('hoverShowMs', v)} />
                          <SliderRow label="Hide speed" value={toolbarConfig.hoverHideMs} min={0} max={600} step={25} unit="ms" onChange={(v) => onUpdateToolbar('hoverHideMs', v)} />
                        </div>
                      </SettingGroup>
                    </>
                  )}

                  <SettingGroup title="Visible tools" description="Toggle which tools appear in the toolbar. Use the ⊙ button in the toolbar itself for quick access.">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {ALL_TOOLBAR_TOOL_IDS.map((id) => {
                        const isOn = toolbarConfig.enabledTools.includes(id);
                        return (
                          <button
                            key={id}
                            onClick={() =>
                              onUpdateToolbar(
                                'enabledTools',
                                isOn
                                  ? toolbarConfig.enabledTools.filter((t) => t !== id)
                                  : [...toolbarConfig.enabledTools, id]
                              )
                            }
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px', borderRadius: 9, border: '1px solid',
                              borderColor: isOn ? 'rgba(111,126,168,0.3)' : 'rgba(255,255,255,0.06)',
                              background: isOn ? 'rgba(111,126,168,0.1)' : 'rgba(255,255,255,0.02)',
                              color: isOn ? 'var(--color-text)' : 'var(--color-text-muted)',
                              cursor: 'pointer', textAlign: 'left', fontSize: 13,
                              transition: 'all 150ms',
                            }}
                          >
                            {TOOL_LABELS[id]}
                            <span style={{
                              width: 28, height: 15, borderRadius: 999, position: 'relative', flexShrink: 0,
                              background: isOn ? 'var(--color-accent)' : 'rgba(255,255,255,0.12)',
                              transition: 'background 150ms', display: 'inline-block',
                            }}>
                              <span style={{
                                position: 'absolute', top: 2, left: isOn ? 15 : 2,
                                width: 11, height: 11, borderRadius: '50%', background: '#fff',
                                transition: 'left 150ms',
                              }} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </SettingGroup>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Settings sub-components ──────────────────────────────────────────────────

function SettingGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 3 }}>{title}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string; icon?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              height: 38, borderRadius: 10,
              border: `1px solid ${active ? 'rgba(111,126,168,0.4)' : 'rgba(255,255,255,0.07)'}`,
              background: active ? 'rgba(111,126,168,0.18)' : 'rgba(255,255,255,0.03)',
              color: active ? 'var(--color-accent-bright)' : 'var(--color-text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400,
              transition: 'all 140ms',
            }}
          >
            {opt.icon && <span style={{ fontSize: 13, opacity: 0.8 }}>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.07)',
        background: checked ? 'rgba(111,126,168,0.07)' : 'rgba(255,255,255,0.02)',
        transition: 'background 150ms',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{label}</span>
      <span style={{
        width: 36, height: 20, borderRadius: 999, position: 'relative', flexShrink: 0,
        background: checked ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)',
        transition: 'background 200ms', display: 'inline-block',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          transition: 'left 200ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </span>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, unit, onChange
}: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--color-accent)', height: 4 }}
      />
    </div>
  );
}

const TOOL_LABELS: Record<ToolbarToolId, string> = {

  'bold': 'Bold',
  'italic': 'Italic',
  'strikethrough': 'Strikethrough',
  'highlight': 'Highlight',
  'heading': 'Heading (H1)',
  'bullet-dash': 'Bullet List  (— dash)',
  'bullet-star': 'Bullet List  (✦ star)',
  'numbered': 'Numbered List',
  'quote': 'Quote Block',
  'code': 'Code Block',
  'smart-colon': 'Flashcard  (⬡ ::)',
  'divider': 'Divider',
};
