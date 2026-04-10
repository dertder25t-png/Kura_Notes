import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ClassItem, FolderItem, NavPlacement, Note, QuickActionsMode } from '../../types';
import Icon from '../ui/Icon';

interface Props {
  placement: NavPlacement;
  quickActionsMode: QuickActionsMode;
  onOpenIsland: () => void;
  activeClassId: number | null;
  activeFolderId: number | null;
  activeNoteId: number | null;
  onSelectClass: (classId: number | null) => void;
  onSelectFolder: (folderId: number | null) => void;
  onOpenNote: (note: Note) => void;
  onCreateClass: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
}

export default function NavigatorRail({
  placement,
  quickActionsMode,
  onOpenIsland,
  activeClassId,
  activeFolderId,
  activeNoteId,
  onSelectClass,
  onSelectFolder,
  onOpenNote,
  onCreateClass,
  onCreateFolder,
  onCreateNote
}: Props) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const selectedClass = activeClassId ?? classes[0]?.id ?? null;
  const selectedFolder = activeFolderId ?? folders[0]?.id ?? null;

  async function refreshClasses() {
    const data = await invoke<ClassItem[]>('list_classes');
    setClasses(data);
    return data;
  }

  async function refreshFolders(classId: number | null) {
    const data = await invoke<FolderItem[]>('list_folders', { classId });
    setFolders(data);
    return data;
  }

  async function refreshNotes(classId: number | null) {
    const data = await invoke<Note[]>('list_notes', { classId });
    setNotes(data);
  }

  useEffect(() => {
    async function bootstrap() {
      const loadedClasses = await refreshClasses();
      const initialClassId = activeClassId ?? loadedClasses[0]?.id;
      if (!initialClassId) {
        onSelectClass(null);
        const loadedFolders = await refreshFolders(null);
        onSelectFolder(loadedFolders[0]?.id ?? null);
        await refreshNotes(null);
        return;
      }

      if (!activeClassId) {
        onSelectClass(initialClassId);
      }

      const loadedFolders = await refreshFolders(initialClassId);
      onSelectFolder(loadedFolders[0]?.id ?? null);
      await refreshNotes(initialClassId);
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshFolders(selectedClass).then((items) => {
      if (!activeFolderId) {
        onSelectFolder(items[0]?.id ?? null);
      }
    });
    void refreshNotes(selectedClass);
  }, [activeClassId]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    }

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  const notesByFolder = useMemo(() => {
    const grouped = new Map<number, Note[]>();
    for (const folder of folders) {
      grouped.set(folder.id, []);
    }
    for (const note of notes) {
      if (note.folderId && grouped.has(note.folderId)) {
        grouped.get(note.folderId)?.push(note);
      }
    }
    return grouped;
  }, [folders, notes]);

  const visibleNotes = useMemo(() => {
    if (!selectedFolder) {
      return [];
    }
    return notesByFolder.get(selectedFolder) ?? [];
  }, [notesByFolder, selectedFolder]);

  const rootStyle =
    placement === 'left'
      ? {
          width: 260,
          borderRight: '1px solid var(--color-border)',
          borderBottom: 'none',
          flexDirection: 'column' as const,
          overflowY: 'auto' as const,
          overflowX: 'hidden' as const
        }
      : {
          width: '100%',
          height: 92,
          borderRight: 'none',
          borderBottom: '1px solid var(--color-border)',
          flexDirection: 'row' as const,
          overflowX: 'auto' as const,
          overflowY: 'hidden' as const
        };

  const sectionStyle =
    placement === 'left'
      ? {
          display: 'grid',
          gap: 6,
          minWidth: 0
        }
      : {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 'max-content',
          paddingRight: 12
        };

  const actionsMenu = (
    <div
      ref={actionMenuRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: 5,
        borderRadius: 999,
        border: '1px solid var(--color-border)',
        background: 'rgba(18, 19, 22, 0.94)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <button
        onClick={() => setIsActionsOpen((v) => !v)}
        title="Quick actions"
        style={{
          width: 34,
          height: 34,
          padding: 0,
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon name="plus" />
      </button>
      <button
        onClick={() => setIsActionsOpen((v) => !v)}
        title="Open menu"
        style={{
          width: 30,
          height: 30,
          padding: 0,
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon name="chevron-down" size={14} />
      </button>
      {isActionsOpen && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            left: -2,
            minWidth: 170,
            padding: 8,
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            background: 'rgba(16, 17, 20, 0.98)',
            display: 'grid',
            gap: 6
          }}
        >
          <button onClick={onCreateNote} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="note" size={14} /> New Note
          </button>
          <button onClick={onCreateFolder} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="folder-plus" size={14} /> New Folder
          </button>
          <button onClick={onCreateClass} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="plus" size={14} /> New Class
          </button>
        </div>
      )}
    </div>
  );

  return (
    <aside
      style={{
        display: 'flex',
        gap: 10,
        background: 'linear-gradient(180deg, #121316 0%, #101114 100%)',
        padding: 10,
        color: 'var(--color-text)',
        position: 'relative',
        ...rootStyle
      }}
    >
      {quickActionsMode === 'rail' && actionsMenu}
      {quickActionsMode === 'island' && (
        <button
          onClick={onOpenIsland}
          title="Open creation island"
          style={{
            width: 34,
            height: 34,
            padding: 0,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(111, 126, 168, 0.2)',
            borderColor: 'rgba(111, 126, 168, 0.42)'
          }}
        >
          <Icon name="plus" />
        </button>
      )}
      <section style={sectionStyle}>
        {placement === 'left' && (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Tags
          </div>
        )}
        {classes.map((classItem) => (
          <button
            key={classItem.id}
            onClick={() => {
              onSelectClass(classItem.id);
              onSelectFolder(null);
              void refreshFolders(classItem.id).then((items) => onSelectFolder(items[0]?.id ?? null));
              void refreshNotes(classItem.id);
            }}
            title={classItem.name}
            style={{
              width: placement === 'left' ? '100%' : 34,
              minWidth: 34,
              height: 34,
              padding: placement === 'left' ? '6px 10px' : 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: placement === 'left' ? 'flex-start' : 'center',
              gap: 8,
              background:
                classItem.id === selectedClass ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              borderColor:
                classItem.id === selectedClass ? 'rgba(111, 126, 168, 0.44)' : 'var(--color-border)',
              borderRadius: 9
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: classItem.color }} />
            {placement === 'left' ? (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {classItem.name}
              </span>
            ) : null}
          </button>
        ))}
      </section>

      <section style={sectionStyle}>
        {placement === 'left' && (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Folders
          </div>
        )}
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            title={folder.name}
            style={{
              width: placement === 'left' ? '100%' : 34,
              minWidth: 34,
              height: 34,
              padding: placement === 'left' ? '6px 10px' : 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: placement === 'left' ? 'flex-start' : 'center',
              gap: 8,
              background:
                folder.id === selectedFolder ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              borderColor:
                folder.id === selectedFolder ? 'rgba(111, 126, 168, 0.44)' : 'var(--color-border)',
              borderRadius: 9
            }}
          >
            <Icon name="folder" size={14} />
            {placement === 'left' ? (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {folder.name}
              </span>
            ) : null}
          </button>
        ))}
      </section>

      <section style={sectionStyle}>
        {placement === 'left' && (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Notes
          </div>
        )}
        {visibleNotes.slice(0, placement === 'left' ? 60 : 20).map((note) => (
          <button
            key={note.id}
            onClick={() => onOpenNote(note)}
            title={note.title || 'Untitled'}
            style={{
              width: placement === 'left' ? '100%' : 34,
              minWidth: 34,
              height: 34,
              padding: placement === 'left' ? '6px 10px' : 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: placement === 'left' ? 'flex-start' : 'center',
              gap: 8,
              background:
                note.id === activeNoteId ? 'rgba(111, 126, 168, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              borderColor:
                note.id === activeNoteId ? 'rgba(111, 126, 168, 0.44)' : 'var(--color-border)',
              borderRadius: 9
            }}
          >
            <Icon name="note" size={14} />
            {placement === 'left' ? (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {note.title || 'Untitled'}
              </span>
            ) : null}
          </button>
        ))}
      </section>
    </aside>
  );
}
