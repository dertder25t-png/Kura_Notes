import { invoke } from '@tauri-apps/api/core';
import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AppMode, CanvasLayoutMode, FolderItem, Note } from '../../types';
import Icon from '../ui/Icon';

interface Props {
  classId: number | null;
  folderId: number | null;
  folderName: string;
  notes: Note[];
  folders: FolderItem[];
  layoutMode: CanvasLayoutMode;
  appMode: AppMode;
  isSettingsOpen: boolean;
  onSetAppMode: (mode: AppMode) => void;
  onToggleSettings: () => void;
  onCycleLayoutMode: () => void;
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
  layoutMode,
  appMode,
  isSettingsOpen,
  onSetAppMode,
  onToggleSettings,
  onCycleLayoutMode,
  onOpenNote,
  onNotesMutated,
  onNotesDeleted
}: Props) {
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<Record<number, NoteLayout>>({});
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);
  const [batchTargetFolderId, setBatchTargetFolderId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [resizingId, setResizingId] = useState<number | null>(null);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const resizeOrigin = useRef<ResizeOrigin | null>(null);

  useEffect(() => {
    if (!classId || !folderId) {
      setLayout({});
      return;
    }

    setLayout(loadLayout(classId, folderId));
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

  const snapToGrid = layoutMode === 'grid';

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
    if (!batchTargetFolderId || selectedNoteIds.length === 0) {
      return;
    }

    try {
      await Promise.all(
        selectedNoteIds.map((noteId) =>
          invoke<Note>('move_note_to_folder', {
            noteId,
            classId: classId ?? null,
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
    <section style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-panel)' }}>
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: 'rgba(18, 19, 22, 0.94)'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Icon name="folder" /> {folderName}
          </strong>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{notes.length} notes</span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onSetAppMode('focus')}
            title="Focus"
            style={{
              width: 34,
              height: 34,
              padding: 0,
              borderRadius: 10,
              background: appMode === 'focus' ? 'rgba(111, 126, 168, 0.22)' : 'rgba(255, 255, 255, 0.03)'
            }}
          >
            <Icon name="focus" />
          </button>
          <button
            onClick={() => onSetAppMode('study')}
            title="Study"
            style={{
              width: 34,
              height: 34,
              padding: 0,
              borderRadius: 10,
              background: appMode === 'study' ? 'rgba(111, 126, 168, 0.22)' : 'rgba(255, 255, 255, 0.03)'
            }}
          >
            <Icon name="study" />
          </button>
          <button
            onClick={onCycleLayoutMode}
            title={`Layout mode: ${layoutMode}. Click to cycle.`}
            style={{ width: 34, height: 34, padding: 0, borderRadius: 10, background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <Icon
              name={layoutMode === 'grid' ? 'grid' : layoutMode === 'column' ? 'layout-left' : 'move'}
            />
          </button>
          <button
            onClick={onToggleSettings}
            title="Settings"
            style={{
              width: 34,
              height: 34,
              padding: 0,
              borderRadius: 10,
              background: isSettingsOpen ? 'rgba(111, 126, 168, 0.22)' : 'rgba(255, 255, 255, 0.03)'
            }}
          >
            <Icon name="settings" />
          </button>
          <button onClick={resetLayout} title="Reset layout" style={{ width: 34, height: 34, padding: 0, borderRadius: 10, background: 'rgba(255, 255, 255, 0.03)' }}>
            <Icon name="reset" />
          </button>
          <button
            onClick={() => {
              if (selectedNoteIds.length === 0) {
                setSelectedNoteIds(filtered.map((note) => note.id));
              } else {
                setSelectedNoteIds([]);
              }
            }}
            title={selectedNoteIds.length === 0 ? 'Select visible' : 'Clear selection'}
            style={{ width: 34, height: 34, padding: 0, borderRadius: 10, background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <Icon name={selectedNoteIds.length === 0 ? 'select' : 'x'} />
          </button>
          <select
            value={batchTargetFolderId ?? ''}
            onChange={(event) => setBatchTargetFolderId(Number(event.target.value))}
            style={{ borderRadius: 10, border: '1px solid var(--color-border)', height: 34, padding: '0 8px', background: 'rgba(255, 255, 255, 0.03)' }}
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                Move to {folder.name}
              </option>
            ))}
          </select>
          <button onClick={moveSelected} disabled={selectedNoteIds.length === 0} title="Move selected" style={{ width: 34, height: 34, padding: 0, borderRadius: 10, background: 'rgba(255, 255, 255, 0.03)' }}>
            <Icon name="move" />
          </button>
          <button onClick={deleteSelected} disabled={selectedNoteIds.length === 0} title="Delete selected" style={{ width: 34, height: 34, padding: 0, borderRadius: 10, background: 'rgba(255, 255, 255, 0.03)', borderColor: 'var(--color-border)' }}>
            <Icon name="trash" />
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter notes"
            style={{ width: 220, height: 34, padding: '0 10px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.03)' }}
          />
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, overflow: 'auto', padding: 16 }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', paddingTop: 10 }}>No notes found in this folder.</div>
        )}

        {filtered.map((note, index) => {
          const position = getNoteLayout(note.id);
          const isColumn = layoutMode === 'column';

          return (
            <div
              key={note.id}
              onPointerDown={isColumn ? undefined : (event) => startDrag(note.id, event)}
              onPointerMove={isColumn ? undefined : onDrag}
              onPointerUp={isColumn ? undefined : endDrag}
              style={{
                position: isColumn ? 'relative' : 'absolute',
                left: isColumn ? undefined : position.x,
                top: isColumn ? undefined : position.y,
                width: isColumn ? '100%' : position.width,
                height: isColumn ? 64 : position.height,
                marginBottom: isColumn ? 10 : 0,
                border: '1px solid #cfdbcc',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.04)',
                padding: 12,
                cursor: isColumn ? 'default' : draggingId === note.id ? 'grabbing' : 'grab',
                boxShadow: draggingId === note.id ? '0 6px 16px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.12)',
                userSelect: 'none',
                display: 'flex',
                flexDirection: isColumn ? 'row' : 'column',
                alignItems: isColumn ? 'center' : undefined,
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
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
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderColor: 'var(--color-border)',
                  fontSize: 12,
                  padding: '6px 10px'
                }}
              >
                <Icon name="note" size={12} />
              </button>

              {!isColumn && (
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
                    border: '1px solid var(--color-border)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    cursor: 'se-resize'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
