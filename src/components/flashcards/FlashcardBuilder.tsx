import Icon from '../ui/Icon';

interface Props {
  noteId: number | null;
}

export default function FlashcardBuilder({ noteId }: Props) {
  if (!noteId) {
    return <div style={{ padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>Select a note first.</div>;
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--color-text)' }}>
      <h3 style={{ margin: 0, fontSize: 15, color: 'rgba(236, 238, 242, 0.9)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Icon name="flashcards" size={14} /> Flashcard Builder
      </h3>
      <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
        Milestone 3 placeholder. Manual card creation UI will be added next.
      </p>
    </div>
  );
}
