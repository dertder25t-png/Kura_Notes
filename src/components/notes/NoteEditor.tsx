import { useEffect, useMemo, useRef, useState } from 'react';
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
    if (!note || !isDirty) {
      return;
    }

    setStatus('Saving...');
    invoke<Note>('save_note', {
      noteId: note.id,
      classId: classId ?? note.classId ?? null,
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

  useEffect(() => {
    if (!noteId) {
      return;
    }
    textareaRef.current?.focus();
  }, [noteId]);

  if (!noteId) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', color: '#5f6a66' }}>
        Select or create a note from the sidebar.
      </div>
    );
  }

  return (
    <section
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-lg) var(--spacing-xl)'
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          style={{
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 0',
            flex: 1,
            background: 'transparent',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: -0.2,
            color: 'rgba(236, 238, 242, 0.88)',
            outline: 'none'
          }}
        />
        <div style={{ fontSize: 12, minWidth: 70, textAlign: 'right', color: 'var(--color-text-muted)' }}>{status}</div>
      </div>
      <textarea
        ref={textareaRef}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your lecture notes in Markdown..."
        style={{
          flex: 1,
          width: '100%',
          padding: 'var(--spacing-sm) 0 var(--spacing-lg)',
          border: 'none',
          outline: 'none',
          resize: 'none',
          lineHeight: 1.8,
          fontSize: 15,
          background: 'transparent',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-note)'
        }}
      />
    </section>
  );
}
