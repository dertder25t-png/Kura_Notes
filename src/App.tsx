import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './components/layout/Sidebar';
import TabBar, { NoteTab } from './components/layout/TabBar';
import DualPane from './components/notes/DualPane';
import FolderCanvas from './components/notes/FolderCanvas';
import ToolDock from './components/tools/ToolDock';
import { defaultTools, RightPanel } from './components/tools/toolRegistry';
import { AppMode, FolderItem, Note, TabPlacement } from './types';

const TAB_PLACEMENT_KEY = 'kura.tab.placement';
const APP_MODE_KEY = 'kura.app.mode';
const LAST_OPEN_NOTE_KEY = 'kura.last.open.note';

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

export default function App() {
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
  const [isToolDockHidden, setIsToolDockHidden] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const attemptedInstantCapture = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(TAB_PLACEMENT_KEY, tabPlacement);
  }, [tabPlacement]);

  useEffect(() => {
    window.localStorage.setItem(APP_MODE_KEY, appMode);
  }, [appMode]);

  useEffect(() => {
    if (!activeClassId) {
      setFolders([]);
      return;
    }

    invoke<FolderItem[]>('list_folders', { classId: activeClassId })
      .then((items) => {
        setFolders(items);
        if (!activeFolderId || !items.find((item) => item.id === activeFolderId)) {
          setActiveFolderId(items[0]?.id ?? null);
        }
      })
      .catch(() => setFolders([]));
  }, [activeClassId, dataVersion]);

  useEffect(() => {
    if (!activeClassId || !activeFolderId) {
      setFolderNotes([]);
      return;
    }

    invoke<Note[]>('list_notes_by_folder', {
      classId: activeClassId,
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

  useEffect(() => {
    if (attemptedInstantCapture.current || activeTabId || !activeClassId || !activeFolderId) {
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
      classId: activeClassId,
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
      onOpenNote={handleOpenNote}
      onNotesMutated={() => setDataVersion((v) => v + 1)}
      onNotesDeleted={handleNotesDeleted}
    />
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activeClassId={activeClassId}
        activeFolderId={activeFolderId}
        activeNoteId={activeNoteId}
        onSelectClass={setActiveClassId}
        onSelectFolder={(folderId) => {
          setActiveFolderId(folderId);
          setActiveNoteId(null);
          setActiveTabId(null);
        }}
        onOpenNote={handleOpenNote}
        onNotesMutated={() => setDataVersion((v) => v + 1)}
        onNotesDeleted={handleNotesDeleted}
      />
      <main style={{ flex: 1, background: 'var(--color-panel)', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 'var(--spacing-md)',
            right: 'var(--spacing-lg)',
            zIndex: 20,
            display: 'inline-flex',
            gap: 6,
            padding: 6,
            borderRadius: 999,
            border: '1px solid var(--color-border)',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <button
            onClick={() => setAppMode('focus')}
            style={{
              borderRadius: 999,
              background: appMode === 'focus' ? 'var(--color-accent)' : '#fff',
              color: appMode === 'focus' ? '#fff' : 'var(--color-text)',
              borderColor: appMode === 'focus' ? 'var(--color-accent)' : 'var(--color-border)'
            }}
          >
            Focus
          </button>
          <button
            onClick={() => setAppMode('study')}
            style={{
              borderRadius: 999,
              background: appMode === 'study' ? 'var(--color-accent)' : '#fff',
              color: appMode === 'study' ? '#fff' : 'var(--color-text)',
              borderColor: appMode === 'study' ? 'var(--color-accent)' : 'var(--color-border)'
            }}
          >
            Study
          </button>
          <button
            onClick={() => setAppMode('organize')}
            style={{
              borderRadius: 999,
              background: appMode === 'organize' ? 'var(--color-accent)' : '#fff',
              color: appMode === 'organize' ? '#fff' : 'var(--color-text)',
              borderColor: appMode === 'organize' ? 'var(--color-accent)' : 'var(--color-border)'
            }}
          >
            Organize
          </button>
        </div>
        {appMode === 'organize' ? organizeShell : focusAndStudyShell}
      </main>

      {appMode !== 'focus' && (
        <ToolDock
          hidden={isToolDockHidden}
          onToggleHidden={() => setIsToolDockHidden((v) => !v)}
          tools={defaultTools}
          context={{
            noteId: activeTab?.noteId ?? null,
            rightPanel,
            setRightPanel,
            tabPlacement,
            setTabPlacement
          }}
        />
      )}
    </div>
  );
}
