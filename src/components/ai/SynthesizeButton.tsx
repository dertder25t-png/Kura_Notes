interface Props {
  noteId: number | null;
}

export default function SynthesizeButton({ noteId }: Props) {
  return (
    <button
      disabled={!noteId}
      title={noteId ? 'AI not ready yet' : 'Select a note first'}
      style={{ opacity: noteId ? 1 : 0.55 }}
      onClick={() => {
        window.alert('AI not ready yet. This button is a Milestone 2 placeholder.');
      }}
    >
      Synthesize
    </button>
  );
}
