import { useEffect, useMemo, useState } from 'react';
import Icon from '../ui/Icon';

interface Props {
  noteId: number | null;
}

export default function FlashcardBuilder({ noteId }: Props) {
  const [highlighted, setHighlighted] = useState('');
  const [pasted, setPasted] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [cards, setCards] = useState<Array<{ id: number; front: string; back: string }>>([]);

  useEffect(() => {
    function onSelection(event: Event) {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      const value = String(event.detail ?? '').trim();
      setHighlighted(value);
    }

    window.addEventListener('kura:editor-selection', onSelection);
    return () => window.removeEventListener('kura:editor-selection', onSelection);
  }, []);

  useEffect(() => {
    setFront('');
    setBack('');
    setHighlighted('');
    setPasted('');
    setCards([]);
  }, [noteId]);

  const canCreate = useMemo(() => front.trim() && back.trim(), [front, back]);

  function useHighlightAsFront() {
    if (highlighted.trim()) {
      setFront(highlighted.trim());
    }
  }

  function usePasteAsBack() {
    if (pasted.trim()) {
      setBack(pasted.trim());
    }
  }

  function addCard() {
    if (!canCreate) {
      return;
    }
    setCards((prev) => [{ id: Date.now(), front: front.trim(), back: back.trim() }, ...prev]);
    setFront('');
    setBack('');
    setPasted('');
  }

  if (!noteId) {
    return <div style={{ padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>Select a note first.</div>;
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'grid', gap: 12, color: 'var(--color-text)', height: '100%', overflowY: 'auto' }}>
      <h3 style={{ margin: 0, fontSize: 15, color: 'rgba(236, 238, 242, 0.9)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Icon name="flashcards" size={14} /> Flashcard Builder
      </h3>

      <section style={{ display: 'grid', gap: 8, border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Highlighted text from editor</div>
        <div style={{ minHeight: 48, fontSize: 13, lineHeight: 1.45, color: highlighted ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
          {highlighted || 'Select text in the note editor to capture it here.'}
        </div>
        <button onClick={useHighlightAsFront} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon name="flashcards" size={13} /> Use highlight as front
        </button>
      </section>

      <section style={{ display: 'grid', gap: 8, border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Paste material</div>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste explanation, definition, or answer text..."
          style={{ minHeight: 90, resize: 'vertical', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--color-text)', padding: 8, fontSize: 13, lineHeight: 1.5 }}
        />
        <button onClick={usePasteAsBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon name="code" size={13} /> Use pasted text as back
        </button>
      </section>

      <section style={{ display: 'grid', gap: 8, border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Card draft</div>
        <input
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Front (question/prompt)"
          style={{ height: 34, borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--color-text)', padding: '0 8px' }}
        />
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Back (answer)"
          style={{ minHeight: 82, resize: 'vertical', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--color-text)', padding: 8, fontSize: 13, lineHeight: 1.5 }}
        />
        <button
          onClick={addCard}
          disabled={!canCreate}
          style={{ opacity: canCreate ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Icon name="plus" size={13} /> Add flashcard draft
        </button>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Draft queue</div>
        {cards.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No draft cards yet.</div>
        ) : (
          cards.map((card) => (
            <article key={card.id} style={{ display: 'grid', gap: 6, border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Front</div>
              <div style={{ fontSize: 13 }}>{card.front}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Back</div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{card.back}</div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
