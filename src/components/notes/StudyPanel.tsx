import { useEffect, useState } from 'react';
import { invoke } from '../../utils/invoke';
import ReactMarkdown from 'react-markdown';
import { Note } from '../../types';

interface Props {
  noteId: number | null;
}

export default function StudyPanel({ noteId }: Props) {
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!noteId) {
      setNote(null);
      return;
    }

    invoke<Note>('load_note', { noteId }).then(setNote).catch(() => setNote(null));
  }, [noteId]);

  if (!noteId) {
    return <div style={{ padding: 20, color: '#5f6a66' }}>Select a note to view study mode.</div>;
  }

  return (
    <section style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      <h3 style={{ marginTop: 0 }}>Study Mode</h3>
      <ReactMarkdown>{note?.rawContent?.trim() || '*No content yet.*'}</ReactMarkdown>
    </section>
  );
}
