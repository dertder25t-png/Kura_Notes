interface Props {
  noteId: number | null;
}

export default function FlashcardBuilder({ noteId }: Props) {
  if (!noteId) {
    return <div style={{ padding: 20, color: '#5f6a66' }}>Select a note first.</div>;
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ margin: 0 }}>Flashcard Builder</h3>
      <p style={{ margin: 0, color: '#5f6a66' }}>
        Milestone 3 placeholder. Manual card creation UI will be added next.
      </p>
    </div>
  );
}
