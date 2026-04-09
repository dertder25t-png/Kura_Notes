import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ClassItem, FolderItem, Note } from '../../types';

interface Props {
  activeClassId: number | null;
  activeNoteId: number | null;
  activeFolderId: number | null;
  onSelectClass: (classId: number | null) => void;
  onSelectFolder: (folderId: number | null) => void;
  onOpenNote: (note: Note) => void;
  onNotesMutated: () => void;
  onNotesDeleted: (noteIds: number[]) => void;
}

export default function Sidebar({
  activeClassId,
  activeNoteId,
  activeFolderId,
  onSelectClass,
  onSelectFolder,
  onOpenNote,
  onNotesMutated,
  onNotesDeleted
}: Props) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#5DCAA5');
  const [newFolderName, setNewFolderName] = useState('');
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [hoveredFolderId, setHoveredFolderId] = useState<number | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<number | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<number | null>(null);

  const selectedClass = activeClassId ?? classes[0]?.id ?? null;
  const selectedFolder = activeFolderId ?? folders[0]?.id ?? null;

  async function refreshClasses() {
    const data = await invoke<ClassItem[]>('list_classes');
    setClasses(data);
    return data;
  }

  async function refreshFolders(classId: number) {
    const data = await invoke<FolderItem[]>('list_folders', { classId });
    setFolders(data);
    return data;
  }

  async function refreshNotes(classId: number) {
    const data = await invoke<Note[]>('list_notes', { classId });
    setNotes(data);
  }

  useEffect(() => {
    async function bootstrap() {
      const loadedClasses = await refreshClasses();
      const initialClassId = activeClassId ?? loadedClasses[0]?.id;
      if (!initialClassId) {
        onSelectClass(null);
        onSelectFolder(null);
        setNotes([]);
        setFolders([]);
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
    if (!selectedClass) {
      setNotes([]);
      setFolders([]);
      onSelectFolder(null);
      return;
    }

    void refreshFolders(selectedClass).then((data) => {
      if (!activeFolderId) {
        onSelectFolder(data[0]?.id ?? null);
      }
    });
    void refreshNotes(selectedClass);
  }, [activeClassId]);

  const groupedNotes = useMemo(() => {
    const groups = new Map<number, Note[]>();
    for (const folder of folders) {
      groups.set(folder.id, []);
    }
    for (const note of notes) {
      if (note.folderId && groups.has(note.folderId)) {
        groups.get(note.folderId)?.push(note);
      }
    }
    return groups;
  }, [folders, notes]);

  const folderNotes = useMemo(() => {
    if (!selectedFolder) {
      return [];
    }
    return groupedNotes.get(selectedFolder) ?? [];
  }, [groupedNotes, selectedFolder]);

  async function createNewNote() {
    if (!selectedClass || !selectedFolder) {
      window.alert('Select a folder first.');
      return;
    }

    const created = await invoke<Note>('save_note', {
      classId: selectedClass,
      folderId: selectedFolder,
      title: `Lecture ${new Date().toLocaleDateString()}`,
      rawContent: ''
    });
    setNotes((prev) => [created, ...prev]);
    onOpenNote(created);
    onNotesMutated();
  }

  async function createFolder() {
    if (!selectedClass) {
      window.alert('Create a class first.');
      return;
    }

    if (!newFolderName.trim()) {
      window.alert('Folder name is required.');
      return;
    }

    try {
      const created = await invoke<FolderItem>('create_folder', {
        classId: selectedClass,
        name: newFolderName.trim()
      });
      setFolders((prev) => [...prev, created]);
      setNewFolderName('');
      setIsFolderFormOpen(false);
      onSelectFolder(created.id);
      onNotesMutated();
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function renameFolder(folder: FolderItem) {
    const input = window.prompt('Rename folder', folder.name);
    if (!input || input.trim() === folder.name) {
      return;
    }

    try {
      const updated = await invoke<FolderItem>('rename_folder', {
        folderId: folder.id,
        name: input.trim()
      });
      setFolders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function deleteFolder(folder: FolderItem) {
    if (!selectedClass) {
      return;
    }

    const confirmed = window.confirm(
      `Delete folder "${folder.name}"? Notes in this folder will move to another folder.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await invoke('delete_folder', {
        classId: selectedClass,
        folderId: folder.id
      });

      const nextFolders = await refreshFolders(selectedClass);
      await refreshNotes(selectedClass);

      if (activeFolderId === folder.id) {
        onSelectFolder(nextFolders[0]?.id ?? null);
      }
      onNotesMutated();
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function moveNote(note: Note, targetFolderId: number) {
    if (!selectedClass || note.folderId === targetFolderId) {
      return;
    }

    try {
      const updated = await invoke<Note>('move_note_to_folder', {
        noteId: note.id,
        classId: selectedClass,
        folderId: targetFolderId
      });

      setNotes((prev) => prev.map((item) => (item.id === note.id ? updated : item)));
      if (activeNoteId === note.id && activeFolderId !== targetFolderId) {
        onSelectFolder(targetFolderId);
      }
      onNotesMutated();
    } catch (error) {
      window.alert(String(error));
    }
  }

  function findNote(noteId: number) {
    return notes.find((note) => note.id === noteId) ?? null;
  }

  async function createClass() {
    if (!newClassName.trim()) {
      window.alert('Class name is required.');
      return;
    }

    try {
      const created = await invoke<ClassItem>('create_class', {
        name: newClassName.trim(),
        color: newClassColor
      });

      const nextClasses = [...classes, created];
      setClasses(nextClasses);
      setNewClassName('');
      setIsClassFormOpen(false);
      onSelectClass(created.id);
      onSelectFolder(null);
      setNotes([]);
      const nextFolders = await refreshFolders(created.id);
      onSelectFolder(nextFolders[0]?.id ?? null);
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function renameActiveClass() {
    const current = classes.find((item) => item.id === selectedClass);
    if (!current) {
      return;
    }

    const input = window.prompt('Rename class', current.name);
    if (!input || input.trim() === current.name) {
      return;
    }

    try {
      const updated = await invoke<ClassItem>('update_class', {
        classId: current.id,
        name: input.trim(),
        color: current.color
      });

      setClasses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function deleteActiveClass() {
    const current = classes.find((item) => item.id === selectedClass);
    if (!current) {
      return;
    }

    const confirmed = window.confirm(
      `Delete class "${current.name}"? This only works when the class has no notes.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await invoke('delete_class', { classId: current.id });
      const remaining = classes.filter((item) => item.id !== current.id);
      setClasses(remaining);
      setNotes([]);
      setFolders([]);
      onSelectFolder(null);
      if (remaining[0]) {
        onSelectClass(remaining[0].id);
        const nextFolders = await refreshFolders(remaining[0].id);
        onSelectFolder(nextFolders[0]?.id ?? null);
        await refreshNotes(remaining[0].id);
      } else {
        onSelectClass(null);
      }
    } catch (error) {
      window.alert(String(error));
    }
  }

  return (
    <aside
      style={{
        width: 280,
        background: 'linear-gradient(180deg, #1c2a2a 0%, #182121 100%)',
        color: '#f6f5ef',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        borderRight: '1px solid #273433'
      }}
    >
      <div>
        <div style={{ fontWeight: 700, letterSpacing: 0.5, fontSize: 18 }}>Scholr</div>
        <div style={{ color: 'var(--color-sidebar-muted)', fontSize: 12 }}>Classspaces</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {classes.map((classItem) => (
          <button
            key={classItem.id}
            onClick={() => {
              onSelectClass(classItem.id);
              onSelectFolder(null);
              void refreshNotes(classItem.id);
              void refreshFolders(classItem.id).then((data) => {
                onSelectFolder(data[0]?.id ?? null);
              });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textAlign: 'left',
              background: classItem.id === selectedClass ? '#263534' : '#1e2d2c',
              color: '#f6f5ef',
              borderColor: classItem.id === selectedClass ? '#35504d' : '#2a3a38'
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: classItem.color,
                flexShrink: 0
              }}
            />
            {classItem.name}
          </button>
        ))}
        {classes.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--color-sidebar-muted)' }}>No classes yet.</div>
        )}

        {!isClassFormOpen ? (
          <button
            onClick={() => setIsClassFormOpen(true)}
            style={{ background: '#1f3533', borderColor: '#35504d', color: '#f6f5ef' }}
          >
            + Add Class
          </button>
        ) : (
          <div style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid #35504d', borderRadius: 10 }}>
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Class or project name"
              style={{ background: '#f6f8f7' }}
            />
            <input
              value={newClassColor}
              onChange={(e) => setNewClassColor(e.target.value)}
              type="color"
              title="Class color"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createClass} style={{ flex: 1 }}>Create</button>
              <button onClick={() => setIsClassFormOpen(false)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={renameActiveClass} disabled={!selectedClass} style={{ flex: 1 }}>
            Rename
          </button>
          <button onClick={deleteActiveClass} disabled={!selectedClass} style={{ flex: 1 }}>
            Delete
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <button
          onClick={() => setIsFolderFormOpen((v) => !v)}
          disabled={!selectedClass}
          style={{ background: '#21403a', borderColor: '#345952', color: '#fff', opacity: selectedClass ? 1 : 0.55 }}
        >
          + New Folder
        </button>

        {isFolderFormOpen && (
          <div style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid #35504d', borderRadius: 10 }}>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              style={{ background: '#f6f8f7' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createFolder} style={{ flex: 1 }}>Create</button>
              <button onClick={() => setIsFolderFormOpen(false)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        )}

        <button
          onClick={createNewNote}
          disabled={!selectedClass || !selectedFolder}
          style={{
            background: '#e0683f',
            borderColor: '#e0683f',
            color: '#fff',
            opacity: selectedClass && selectedFolder ? 1 : 0.55
          }}
        >
          + New Note
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        {folders.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--color-sidebar-muted)' }}>No folders yet for this class.</div>
        )}

        {folders.map((folder) => {
          const notesInFolder = groupedNotes.get(folder.id) ?? [];
          const isActive = folder.id === selectedFolder;

          return (
            <div
              key={folder.id}
              onMouseEnter={() => setHoveredFolderId(folder.id)}
              onMouseLeave={() => setHoveredFolderId((current) => (current === folder.id ? null : current))}
              onDragOver={(event) => {
                if (!draggingNoteId) {
                  return;
                }
                event.preventDefault();
                setDropTargetFolderId(folder.id);
              }}
              onDragLeave={() => {
                setDropTargetFolderId((current) => (current === folder.id ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = Number(event.dataTransfer.getData('text/note-id'));
                const sourceNote = findNote(sourceId);
                if (sourceNote) {
                  void moveNote(sourceNote, folder.id);
                }
                setDraggingNoteId(null);
                setDropTargetFolderId(null);
              }}
              style={{ position: 'relative' }}
            >
              <button
                onClick={() => onSelectFolder(folder.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'grid',
                  gap: 6,
                  background: isActive ? '#2f4744' : '#1f2d2c',
                  color: '#f6f5ef',
                  borderColor:
                    dropTargetFolderId === folder.id
                      ? '#79be99'
                      : isActive
                        ? '#4f706d'
                        : '#2a3a38'
                }}
              >
                <span style={{ fontWeight: 600 }}>Folder: {folder.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#acc4ba', fontSize: 12 }}>
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    {notesInFolder.slice(0, 5).map((note) => (
                      <span
                        key={note.id}
                        style={{ width: 8, height: 8, borderRadius: 999, background: '#7cb9a4', display: 'inline-block' }}
                      />
                    ))}
                  </span>
                  <span>{notesInFolder.length} notes</span>
                </span>
              </button>

              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button
                  onClick={() => renameFolder(folder)}
                  style={{ flex: 1, fontSize: 12, background: '#21312f', color: '#d6e4de', borderColor: '#35514b' }}
                >
                  Rename
                </button>
                <button
                  onClick={() => deleteFolder(folder)}
                  style={{ flex: 1, fontSize: 12, background: '#342522', color: '#f0dad5', borderColor: '#5a3832' }}
                >
                  Delete
                </button>
              </div>

              {hoveredFolderId === folder.id && notesInFolder.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 22,
                    top: '100%',
                    marginTop: 4,
                    width: 230,
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: '1px solid #32524a',
                    borderRadius: 10,
                    background: '#152321',
                    zIndex: 4,
                    padding: 8,
                    display: 'grid',
                    gap: 6
                  }}
                >
                  {notesInFolder.map((note) => (
                    <div
                      key={note.id}
                      style={{ display: 'grid', gap: 4 }}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/note-id', String(note.id));
                        setDraggingNoteId(note.id);
                      }}
                      onDragEnd={() => {
                        setDraggingNoteId(null);
                        setDropTargetFolderId(null);
                      }}
                    >
                      <button
                        onClick={() => onOpenNote(note)}
                        style={{
                          textAlign: 'left',
                          background: note.id === activeNoteId ? '#31514b' : '#203430',
                          color: '#f5f8f6',
                          borderColor: '#3a6159'
                        }}
                      >
                        {note.title || 'Untitled'}
                      </button>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#d6e4de',
                          opacity: 0.9,
                          padding: '2px 4px'
                        }}
                      >
                        Drag this note onto another folder to move it.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {selectedFolder && folderNotes.length > 0 && (
          <div style={{ borderTop: '1px solid #2f4240', marginTop: 4, paddingTop: 8, display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9db6ad' }}>
              Selected Folder Notes
            </div>
            {folderNotes.slice(0, 6).map((note) => (
              <button
                key={note.id}
                onClick={() => onOpenNote(note)}
                style={{
                  textAlign: 'left',
                  background: note.id === activeNoteId ? '#2d413f' : '#1f2d2c',
                  color: '#f6f5ef',
                  borderColor: note.id === activeNoteId ? '#496865' : '#2a3a38'
                }}
              >
                {note.title || 'Untitled'}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
