import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDebounce } from '../../hooks/useDebounce';
import { Note } from '../../types';

interface Props {
  noteId: number | null;
  classId: number | null;
}

export default function NoteEditor({ noteId, classId }: Props) {
  const [note, setNote] = useState<Note | null>(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const debouncedText = useDebounce(text, 3000);
  const debouncedTitle = useDebounce(title, 3000);

  useEffect(() => {
    if (!noteId) {
      setNote(null);
      setText('');
      setTitle('');
      return;
    }

    invoke<Note>('load_note', { noteId }).then((loaded) => {
      setNote(loaded);
      setText(loaded.rawContent);
      setTitle(loaded.title ?? 'Untitled');
    });
  }, [noteId]);

  const isDirty = useMemo(() => {
    if (!note) {
      return false;
    }
    return debouncedText !== note.rawContent || debouncedTitle !== note.title;
  }, [debouncedText, debouncedTitle, note]);

  useEffect(() => {
    if (!note || !classId || !isDirty) {
      return;
    }

    setStatus('Saving...');
    invoke<Note>('save_note', {
      noteId: note.id,
      classId,
      folderId: note.folderId ?? null,
      title: debouncedTitle,
      rawContent: debouncedText
    })
      .then((saved) => {
        setNote(saved);
        setStatus('Saved');
        window.setTimeout(() => setStatus(''), 1200);
      })
      .catch(() => setStatus('Save failed'));
  }, [debouncedText, debouncedTitle]);

  if (!noteId) {
    return <div style={{ padding: 24 }}>Select or create a note from the sidebar.</div>;
  }

  return (
    <section style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '8px 10px',
            flex: 1,
            background: '#fff'
          }}
        />
        <div style={{ fontSize: 12, minWidth: 70, textAlign: 'right', alignSelf: 'center' }}>{status}</div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your lecture notes in Markdown..."
        style={{
          flex: 1,
          width: '100%',
          padding: 20,
          border: 'none',
          outline: 'none',
          resize: 'none',
          lineHeight: 1.5,
          background: '#fbfbf8'
        }}
      />
    </section>
  );
}
