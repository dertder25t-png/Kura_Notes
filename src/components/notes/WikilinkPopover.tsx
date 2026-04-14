import { useEffect, useState } from 'react';
import { invoke } from '../../utils/invoke';
import { Note } from '../../types';
import Icon from '../ui/Icon';

interface Position {
  x: number;
  y: number;
}

interface WikilinkPopoverProps {
  query: string;
  position: Position | null;
  onSelect: (noteId: number, title: string) => void;
  onClose: () => void;
  selectedIndex: number;
}

export default function WikilinkPopover({ query, position, onSelect, onClose, selectedIndex }: WikilinkPopoverProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);

  useEffect(() => {
    invoke<Note[]>('list_notes', { classId: null })
      .then((allNotes) => {
        setNotes(allNotes);
        setFilteredNotes(allNotes);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setFilteredNotes(notes);
    } else {
      setFilteredNotes(
        notes.filter((n) => (n.title || 'Untitled').toLowerCase().includes(q))
      );
    }
  }, [query, notes]);

  // Synchronize external selectedIndex with visual active item
  useEffect(() => {
    if (filteredNotes.length === 0) return;
    const activeEl = document.getElementById(`wikilink-item-${selectedIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, filteredNotes]);

  // Bubble up filtered notes so parent knows count to clamp index
  useEffect(() => {
    const event = new CustomEvent('kura:wikilink-filtered', { detail: filteredNotes.length });
    window.dispatchEvent(event);
  }, [filteredNotes]);

  if (!position) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: position.y + 24,
        left: position.x,
        minWidth: 260,
        maxHeight: 240,
        overflowY: 'auto',
        backgroundColor: 'var(--color-panel-elevated)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 60,
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {filteredNotes.length === 0 ? (
        <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>
          No matching notes
        </div>
      ) : (
        filteredNotes.map((note, idx) => (
          <button
            key={note.id}
            id={`wikilink-item-${idx}`}
            onClick={() => onSelect(note.id, note.title || 'Untitled')}
            style={{
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: selectedIndex === idx ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Icon name="note" size={14} className="opacity-70" />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {note.title || 'Untitled'}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
