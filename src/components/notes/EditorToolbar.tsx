import { EditorAction } from './NoteEditor';
import Icon from '../ui/Icon';

interface EditorToolbarProps {
  onAction: (action: EditorAction) => void;
  position: 'top' | 'left' | 'off';
  isVisible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function EditorToolbar({ onAction, position, isVisible, onMouseEnter, onMouseLeave }: EditorToolbarProps) {
  if (position === 'off') return null;

  const isLeft = position === 'left';

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex',
        flexDirection: isLeft ? 'column' : 'row',
        gap: 6,
        padding: '8px',
        background: 'var(--color-panel-elevated)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border)',
        borderRadius: isLeft ? '12px' : '10px',
        position: 'absolute',
        top: isLeft ? 100 : 20,
        left: isLeft ? -20 : '50%',
        transform: isLeft ? 'none' : 'translateX(-50%)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 300ms ease, transform 300ms ease',
        zIndex: 40,
        boxShadow: 'var(--shadow-lg)'
      }}
    >
      <ToolbarButton onClick={() => onAction('bold')} title="Bold">
        <span style={{ fontWeight: 'bold' }}>B</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => onAction('italic')} title="Italic">
        <span style={{ fontStyle: 'italic', fontFamily: 'serif' }}>I</span>
      </ToolbarButton>
      
      <div style={{ [isLeft ? 'width' : 'height']: '16px', [isLeft ? 'height' : 'width']: '1px', background: 'var(--color-border)', margin: '4px' }} />

      <ToolbarButton onClick={() => onAction('heading')} title="Heading">
        <Icon name="heading" size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAction('bullet')} title="Bullet List">
        <Icon name="list" size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAction('quote')} title="Quote">
        <Icon name="quote" size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAction('flashcard')} title="New Flashcard">
        <Icon name="flashcards" size={16} />
      </ToolbarButton>

      <div style={{ [isLeft ? 'width' : 'height']: '16px', [isLeft ? 'height' : 'width']: '1px', background: 'var(--color-border)', margin: '4px' }} />

      <ToolbarButton onClick={() => onAction('layout-top')} title="Custom Layout">
        <Icon name="layout-top" size={16} />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        padding: 0,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--color-text)',
        border: 'none',
        cursor: 'pointer'
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-accent-dim)')}
      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}
