import { invoke } from '@tauri-apps/api/core';
import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FolderItem, Note } from '../../types';

interface Props {
  classId: number | null;
  folderId: number | null;
  folderName: string;
  notes: Note[];
  folders: FolderItem[];
  onOpenNote: (note: Note) => void;
  onNotesMutated: () => void;
  onNotesDeleted: (noteIds: number[]) => void;
}

interface Position {
  x: number;
  y: number;
}

interface NoteLayout extends Position {
  width: number;
  height: number;
}

interface ResizeOrigin {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

const GRID_SIZE = 16;
const DEFAULT_WIDTH = 190;
const DEFAULT_HEIGHT = 130;
const MIN_WIDTH = 160;
const MIN_HEIGHT = 110;

function readLayoutKey(classId: number, folderId: number) {
  return `kura.folder.layout.${classId}.${folderId}`;
}

function readSettingsKey(classId: number, folderId: number) {
  return `kura.folder.settings.${classId}.${folderId}`;
}

function loadLayout(classId: number, folderId: number): Record<number, NoteLayout> {
  const raw = window.localStorage.getItem(readLayoutKey(classId, folderId));
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<number, NoteLayout>;
  } catch {
    return {};
  }
}

function saveLayout(classId: number, folderId: number, layout: Record<number, NoteLayout>) {
  window.localStorage.setItem(readLayoutKey(classId, folderId), JSON.stringify(layout));
}

function loadSnapSetting(classId: number, folderId: number): boolean {
  const raw = window.localStorage.getItem(readSettingsKey(classId, folderId));
  return raw === '1';
}

function saveSnapSetting(classId: number, folderId: number, enabled: boolean) {
  window.localStorage.setItem(readSettingsKey(classId, folderId), enabled ? '1' : '0');
}

function roundToGrid(value: number, enabled: boolean) {
  if (!enabled) {
    return value;
  }
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export default function FolderCanvas({
  classId,
  folderId,
  folderName,
  notes,
  folders,
  onOpenNote,
  onNotesMutated,
  onNotesDeleted
}: Props) {
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<Record<number, NoteLayout>>({});
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);
  const [batchTargetFolderId, setBatchTargetFolderId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [resizingId, setResizingId] = useState<number | null>(null);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const resizeOrigin = useRef<ResizeOrigin | null>(null);

  useEffect(() => {
    if (!classId || !folderId) {
      setLayout({});
      setSnapToGrid(false);
      return;
    }

    setLayout(loadLayout(classId, folderId));
    setSnapToGrid(loadSnapSetting(classId, folderId));
  }, [classId, folderId]);

  useEffect(() => {
    setSelectedNoteIds([]);
    setBatchTargetFolderId(folderId ?? null);
  }, [folderId]);

  useEffect(() => {
    if (!classId || !folderId) {
      return;
    }

    saveLayout(classId, folderId, layout);
  }, [classId, folderId, layout]);

  useEffect(() => {
    if (!classId || !folderId) {
      return;
    }

    saveSnapSetting(classId, folderId, snapToGrid);
  }, [classId, folderId, snapToGrid]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return notes;
    }
    return notes.filter((note) => note.title.toLowerCase().includes(value));
  }, [notes, query]);

  const defaultLayout = useMemo<Record<number, NoteLayout>>(() => {
    const next: Record<number, NoteLayout> = {};
    filtered.forEach((note, index) => {
      next[note.id] = {
        x: 20 + (index % 4) * 220,
        y: 20 + Math.floor(index / 4) * 170,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT
      };
    });
    return next;
  }, [filtered]);

  function getNoteLayout(noteId: number): NoteLayout {
    return layout[noteId] ?? defaultLayout[noteId] ?? { x: 20, y: 20, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }

  function updateSingleNoteLayout(noteId: number, next: NoteLayout) {
    setLayout((prev) => ({
      ...prev,
      [noteId]: next
    }));
  }

  function startDrag(noteId: number, event: PointerEvent<HTMLDivElement>) {
    if (!classId || !folderId || resizingId) {
      return;
    }

    const current = getNoteLayout(noteId);
    dragOffset.current = {
      x: event.clientX - current.x,
      y: event.clientY - current.y
    };

    setDraggingId(noteId);
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  }

  function onDrag(event: PointerEvent<HTMLDivElement>) {
    if (!classId || !folderId || !draggingId || resizingId) {
      return;
    }

    const current = getNoteLayout(draggingId);
    const next = {
      x: Math.max(0, roundToGrid(event.clientX - dragOffset.current.x, snapToGrid)),
      y: Math.max(0, roundToGrid(event.clientY - dragOffset.current.y, snapToGrid)),
      width: current.width,
      height: current.height
    };

    updateSingleNoteLayout(draggingId, next);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (draggingId) {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
  }

  function startResize(noteId: number, event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    const current = getNoteLayout(noteId);
    resizeOrigin.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: current.width,
      startHeight: current.height
    };
    setResizingId(noteId);
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  }

  function onResize(event: PointerEvent<HTMLDivElement>) {
    if (!resizingId || !resizeOrigin.current) {
      return;
    }

    const deltaX = event.clientX - resizeOrigin.current.startX;
    const deltaY = event.clientY - resizeOrigin.current.startY;
    const current = getNoteLayout(resizingId);
    const next: NoteLayout = {
      ...current,
      width: Math.max(MIN_WIDTH, roundToGrid(resizeOrigin.current.startWidth + deltaX, snapToGrid)),
      height: Math.max(MIN_HEIGHT, roundToGrid(resizeOrigin.current.startHeight + deltaY, snapToGrid))
    };

    updateSingleNoteLayout(resizingId, next);
  }

  function endResize(event: PointerEvent<HTMLDivElement>) {
    if (resizingId) {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
    }
    setResizingId(null);
    resizeOrigin.current = null;
  }

  function resetLayout() {
    if (!classId || !folderId) {
      return;
    }

    window.localStorage.removeItem(readLayoutKey(classId, folderId));
    setLayout({});
  }

  function toggleSelected(noteId: number, checked: boolean) {
    setSelectedNoteIds((prev) => {
      if (checked) {
        if (prev.includes(noteId)) {
          return prev;
        }
        return [...prev, noteId];
      }
      return prev.filter((id) => id !== noteId);
    });
  }

  async function moveSelected() {
    if (!classId || !batchTargetFolderId || selectedNoteIds.length === 0) {
      return;
    }

    try {
      await Promise.all(
        selectedNoteIds.map((noteId) =>
          invoke<Note>('move_note_to_folder', {
            noteId,
            classId,
            folderId: batchTargetFolderId
          })
        )
      );

      setSelectedNoteIds([]);
      onNotesMutated();
    } catch (error) {
      window.alert(String(error));
    }
  }

  async function deleteSelected() {
    if (selectedNoteIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedNoteIds.length} selected notes?`);
    if (!confirmed) {
      return;
    }

    try {
      await Promise.all(
        selectedNoteIds.map((noteId) =>
          invoke('delete_note', {
            noteId
          })
        )
      );

      const deletedIds = [...selectedNoteIds];
      setSelectedNoteIds([]);
      onNotesDeleted(deletedIds);
      onNotesMutated();
    } catch (error) {
      window.alert(String(error));
    }
  }

  return (
    <section style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fbfaf5' }}>
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <strong>{folderName}</strong>
        <span style={{ color: '#667168', fontSize: 13 }}>{notes.length} notes</span>
        <div style={{ flex: 1 }} />
        <label style={{ fontSize: 12, color: '#526058', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(event) => setSnapToGrid(event.target.checked)}
          />
          Snap to grid
        </label>
        <button onClick={resetLayout} style={{ background: '#fff' }}>
          Reset Layout
        </button>
        <button
          onClick={() => {
            if (selectedNoteIds.length === 0) {
              setSelectedNoteIds(filtered.map((note) => note.id));
            } else {
              setSelectedNoteIds([]);
            }
          }}
          style={{ background: '#fff' }}
        >
          {selectedNoteIds.length === 0 ? 'Select Visible' : 'Clear Selection'}
        </button>
        <select
          value={batchTargetFolderId ?? ''}
          onChange={(event) => setBatchTargetFolderId(Number(event.target.value))}
          style={{ borderRadius: 8, border: '1px solid var(--color-border)', padding: '6px 8px', background: '#fff' }}
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              Move selected to {folder.name}
            </option>
          ))}
        </select>
        <button onClick={moveSelected} disabled={selectedNoteIds.length === 0} style={{ background: '#f1f7f2' }}>
          Move Selected ({selectedNoteIds.length})
        </button>
        <button onClick={deleteSelected} disabled={selectedNoteIds.length === 0} style={{ background: '#fff0ee', borderColor: '#e2bab2' }}>
          Delete Selected
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter notes"
          style={{ width: 250, background: '#fff' }}
        />
      </div>

      <div style={{ position: 'relative', flex: 1, overflow: 'auto', padding: 16 }}>
        {filtered.length === 0 && (
          <div style={{ color: '#667168', paddingTop: 10 }}>No notes found in this folder.</div>
        )}

        {filtered.map((note, index) => {
          const position = getNoteLayout(note.id);

          return (
            <div
              key={note.id}
              onPointerDown={(event) => startDrag(note.id, event)}
              onPointerMove={onDrag}
              onPointerUp={endDrag}
              style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: position.width,
                height: position.height,
                border: '1px solid #cfdbcc',
                borderRadius: 14,
                background: '#fff',
                padding: 12,
                cursor: draggingId === note.id ? 'grabbing' : 'grab',
                boxShadow: draggingId === note.id ? '0 6px 16px rgba(0,0,0,0.18)' : '0 3px 8px rgba(0,0,0,0.08)',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedNoteIds.includes(note.id)}
                    onChange={(event) => toggleSelected(note.id, event.target.checked)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span>{note.title || 'Untitled'}</span>
                </label>
              </div>
              <button
                onClick={() => onOpenNote(note)}
                style={{
                  alignSelf: 'flex-start',
                  background: '#f3f7f2',
                  borderColor: '#bdd0bc',
                  fontSize: 12,
                  padding: '6px 10px'
                }}
              >
                Open note
              </button>

              <div
                onPointerDown={(event) => startResize(note.id, event)}
                onPointerMove={onResize}
                onPointerUp={endResize}
                title="Resize"
                style={{
                  position: 'absolute',
                  right: 6,
                  bottom: 6,
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: '1px solid #b9cac0',
                  background: '#eff5ef',
                  cursor: 'se-resize'
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
