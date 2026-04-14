import Icon from '../ui/Icon';

interface Position {
  x: number;
  y: number;
}

interface SelectionToolbarProps {
  selectedText: string;
  position: Position | null;
  onFlashcard: () => void;
  onHighlight: () => void;
}

export default function SelectionToolbar({ selectedText, position, onFlashcard, onHighlight }: SelectionToolbarProps) {
  if (!position || !selectedText.trim()) return null;

  return (
    <div
      className="selection-toolbar"
      style={{
        position: 'absolute',
        top: position.y - 48,
        left: position.x,
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: '6px',
        backgroundColor: 'var(--color-panel-elevated)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-full)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 50,
      }}
    >
      <button
        className="btn-ghost btn-icon"
        onClick={onFlashcard}
        title="Make flashcard"
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)' }}
      >
        <Icon name="flashcards" size={16} />
      </button>
      <button
        className="btn-ghost btn-icon"
        onClick={onHighlight}
        title="Highlight text"
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)' }}
      >
        <Icon name="sparkles" size={16} />
      </button>
    </div>
  );
}
