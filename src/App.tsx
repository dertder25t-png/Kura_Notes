import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './components/layout/Sidebar';
import TabBar, { NoteTab } from './components/layout/TabBar';
import DualPane from './components/notes/DualPane';
import FolderCanvas from './components/notes/FolderCanvas';
import ToolDock from './components/tools/ToolDock';
import { defaultTools, RightPanel } from './components/tools/toolRegistry';
import { FolderItem, Note, TabPlacement } from './types';

const TAB_PLACEMENT_KEY = 'kura.tab.placement';

function loadTabPlacement(): TabPlacement {
  const value = window.localStorage.getItem(TAB_PLACEMENT_KEY);
  if (value === 'left') {
    return 'left';
  }
  return 'top';
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
  const [isToolDockHidden, setIsToolDockHidden] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    window.localStorage.setItem(TAB_PLACEMENT_KEY, tabPlacement);
  }, [tabPlacement]);

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

  const content = activeTab ? (
    <DualPane noteId={activeTab.noteId} classId={activeClassId} rightPanel={rightPanel} />
  ) : (
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

  const shell =
    tabPlacement === 'top' ? (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          placement={tabPlacement}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
        />
        <div style={{ flex: 1, minHeight: 0 }}>{content}</div>
      </div>
    ) : (
      <div style={{ display: 'flex', height: '100%' }}>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          placement={tabPlacement}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
        />
        <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
      </div>
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
        {shell}
      </main>

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
    </div>
  );
}
