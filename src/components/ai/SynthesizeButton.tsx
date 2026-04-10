import Icon from '../ui/Icon';

interface Props {
  noteId: number | null;
}

export default function SynthesizeButton({ noteId }: Props) {
  return (
    <button
      disabled={!noteId}
      title={noteId ? 'AI not ready yet' : 'Select a note first'}
      style={{
        opacity: noteId ? 1 : 0.45,
        background: 'rgba(255, 255, 255, 0.03)',
        borderColor: 'var(--color-border)',
        padding: '7px 10px',
        fontSize: 12,
        color: 'var(--color-text)'
      }}
      onClick={() => {
        window.alert('AI not ready yet. This button is a Milestone 2 placeholder.');
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon name="sparkles" size={13} /> Synthesize
      </span>
    </button>
  );
}
