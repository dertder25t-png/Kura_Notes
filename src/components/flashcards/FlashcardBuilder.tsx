import { useEffect, useMemo, useState } from 'react';
import { invoke } from '../../utils/invoke';
import { Flashcard } from '../../types';
import Icon from '../ui/Icon';

interface Props {
  noteId: number | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function FlashcardBuilder({ noteId, isFullscreen = false, onToggleFullscreen }: Props) {
  const [highlighted, setHighlighted] = useState('');
  const [pasted, setPasted] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedCards, setSavedCards] = useState<Flashcard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  async function loadCards(targetNoteId: number | null) {
    if (!targetNoteId) {
      setSavedCards([]);
      setActiveIndex(0);
      return;
    }

    try {
      const cards = await invoke<Flashcard[]>('list_flashcards', {
        noteId: targetNoteId,
        classId: null
      });
      setSavedCards(cards);
      setActiveIndex(0);
      setShowBack(false);
    } catch {
      setSavedCards([]);
      setActiveIndex(0);
    }
  }

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
    setStatus('');
    void loadCards(noteId);
  }, [noteId]);

  useEffect(() => {
    function onDataInvalidated() {
      void loadCards(noteId);
    }

    window.addEventListener('kura:data-invalidated', onDataInvalidated);
    return () => window.removeEventListener('kura:data-invalidated', onDataInvalidated);
  }, [noteId]);

  const canCreate = useMemo(() => front.trim() && back.trim(), [front, back]);

  function useHighlightAsFront() {
    if (highlighted.trim()) {
      setFront(highlighted.trim());
    }
  }

  function useHighlightAsBack() {
    if (highlighted.trim()) {
      setBack(highlighted.trim());
    }
  }

  function usePasteAsBack() {
    if (pasted.trim()) {
      setBack(pasted.trim());
    }
  }

  function usePasteAsFront() {
    if (pasted.trim()) {
      setFront(pasted.trim());
    }
  }

  function cycleCard(delta: number) {
    if (savedCards.length === 0) {
      return;
    }
    setActiveIndex((prev) => (prev + delta + savedCards.length) % savedCards.length);
    setShowBack(false);
  }

  function jumpToCard(index: number) {
    setActiveIndex(index);
    setShowBack(false);
  }

  function randomCard() {
    if (savedCards.length < 2) {
      return;
    }
    const nextIndex = Math.floor(Math.random() * savedCards.length);
    setActiveIndex(nextIndex);
    setShowBack(false);
  }

  async function deleteActiveCard() {
    const active = savedCards[activeIndex];
    if (!active || !noteId) {
      return;
    }

    const confirmed = window.confirm('Delete this flashcard? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    try {
      await invoke('delete_flashcard', { cardId: active.id });
      setStatus('Card deleted');
      window.setTimeout(() => setStatus(''), 1200);

      const nextIndex = Math.max(0, Math.min(activeIndex, savedCards.length - 2));
      await loadCards(noteId);
      setActiveIndex(nextIndex);
      setShowBack(false);
      window.dispatchEvent(new CustomEvent('kura:data-invalidated'));
    } catch {
      setStatus('Could not delete card');
    } finally {
      setIsSaving(false);
    }
  }

  async function addCard() {
    if (!canCreate || !noteId) {
      return;
    }

    setIsSaving(true);
    try {
      await invoke<Flashcard>('create_flashcard', {
        noteId,
        classId: null,
        sourceLineIndex: 0,
        contextType: 'manual',
        contextLabel: 'Manual',
        front: front.trim(),
        back: back.trim(),
        sourceLine: front.trim(),
        metadataJson: JSON.stringify({ createdFrom: 'flashcard_builder' })
      });

      setStatus('Card saved');
      window.setTimeout(() => setStatus(''), 1200);
      void loadCards(noteId);
      window.dispatchEvent(new CustomEvent('kura:data-invalidated'));
    } catch {
      setStatus('Could not save card');
    } finally {
      setIsSaving(false);
    }

    setFront('');
    setBack('');
    setPasted('');
  }

  const activeCard = savedCards[activeIndex] ?? null;

  if (!noteId) {
    return <div style={{ padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>Select a note first.</div>;
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'grid', gap: 12, color: 'var(--color-text)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: 'rgba(236, 238, 242, 0.9)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon name="flashcards" size={14} /> Flashcards
        </h3>
        {onToggleFullscreen ? (
          <button
            type="button"
            onClick={onToggleFullscreen}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 999,
              fontSize: 12,
              lineHeight: 1,
              padding: '6px 10px',
              background: 'rgba(111, 126, 168, 0.12)',
              color: 'var(--color-accent-bright)'
            }}
          >
            {isFullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
        ) : null}
      </div>

      <section style={{ display: 'grid', gap: 10, border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {savedCards.length} saved {savedCards.length === 1 ? 'card' : 'cards'} for this note
          </div>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button onClick={() => cycleCard(-1)} disabled={savedCards.length === 0}>Prev</button>
            <button onClick={randomCard} disabled={savedCards.length < 2}>Shuffle</button>
            <button onClick={() => cycleCard(1)} disabled={savedCards.length === 0}>Next</button>
          </div>
        </div>

        {activeCard ? (
          <>
            <div style={{ display: 'grid', gap: 6, border: '1px solid rgba(111, 126, 168, 0.24)', borderRadius: 10, padding: 10, background: 'rgba(111, 126, 168, 0.08)' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Front</div>
              <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{activeCard.front || '(empty front)'}</div>
              {showBack ? (
                <>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Back</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{activeCard.back || '(empty back)'}</div>
                </>
              ) : null}
            </div>
            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowBack((prev) => !prev)}>
                {showBack ? 'Hide answer' : 'Reveal answer'}
              </button>
              <button onClick={() => { void deleteActiveCard(); }} disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="trash" size={13} /> Delete card
              </button>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Card {activeIndex + 1} of {savedCards.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {savedCards.slice(0, 24).map((card, index) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => jumpToCard(index)}
                  style={{
                    border: '1px solid var(--color-border)',
                    background: index === activeIndex ? 'rgba(111, 126, 168, 0.25)' : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: 1,
                    padding: '5px 9px'
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            No saved cards yet. Highlight text in the note and use the flashcard action, or create one below.
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 8, border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Highlighted text from editor</div>
        <div style={{ minHeight: 48, fontSize: 13, lineHeight: 1.45, color: highlighted ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
          {highlighted || 'Select text in the note editor to capture it here.'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button onClick={useHighlightAsFront} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="flashcards" size={13} /> Use highlight as front
          </button>
          <button onClick={useHighlightAsBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="flashcards" size={13} /> Use highlight as back
          </button>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 8, border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Paste material</div>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste explanation, definition, or answer text..."
          style={{ minHeight: 90, resize: 'vertical', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--color-text)', padding: 8, fontSize: 13, lineHeight: 1.5 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button onClick={usePasteAsFront} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="code" size={13} /> Use pasted text as front
          </button>
          <button onClick={usePasteAsBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="code" size={13} /> Use pasted text as back
          </button>
        </div>
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
          disabled={!canCreate || isSaving}
          style={{ opacity: canCreate && !isSaving ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Icon name="plus" size={13} /> {isSaving ? 'Saving...' : 'Save flashcard'}
        </button>
        {status ? <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{status}</div> : null}
      </section>
    </div>
  );
}
