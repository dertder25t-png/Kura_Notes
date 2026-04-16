import { useState } from 'react';
import Icon from '../ui/Icon';
import { logTelemetryEvent } from '../../utils/invoke';

interface Props {
  noteId: number | null;
}

export default function SynthesizeButton({ noteId }: Props) {
  const [hint, setHint] = useState<string>('');

  return (
    <>
      <button
        disabled={!noteId}
        title={noteId ? 'Telemetry ready. Model generation is in progress for V1.' : 'Select a note first'}
        style={{
          opacity: noteId ? 1 : 0.45,
          background: 'rgba(255, 255, 255, 0.03)',
          borderColor: 'var(--color-border)',
          padding: '7px 10px',
          fontSize: 12,
          color: 'var(--color-text)'
        }}
        onClick={() => {
          if (!noteId) {
            return;
          }

          void logTelemetryEvent('SYNTHESIZE_REQUESTED', noteId, {
            source: 'toolbar',
            phase: 'v1-foundation'
          });
          setHint('Synthesis pipeline foundation is active. Generation arrives in the next phase.');
          window.setTimeout(() => setHint(''), 1800);
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="sparkles" size={13} /> Synthesize
        </span>
      </button>
      {hint ? (
        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>{hint}</span>
      ) : null}
    </>
  );
}
