import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauriRuntime } from '../../utils/invoke';

type EngineState = 'IDLE' | 'WARMING' | 'THROTTLED' | 'RATE_LIMITED' | 'BATTERY_SAVER' | 'MODEL_UNAVAILABLE';

type EngineStatusEvent = {
  state?: string;
};

export default function EngineStatus() {
  const [engineState, setEngineState] = useState<EngineState>('IDLE');

  useEffect(() => {
    if (!isTauriRuntime) {
      return;
    }

    const stop = listen<EngineStatusEvent>('kura:engine-status', (event) => {
      const next = event.payload?.state;
      if (next === 'THROTTLED' || next === 'RATE_LIMITED' || next === 'WARMING' || next === 'IDLE' || next === 'BATTERY_SAVER' || next === 'MODEL_UNAVAILABLE') {
        setEngineState(next);
      }
    });

    return () => {
      void stop.then((unlisten) => unlisten());
    };
  }, []);

  if (engineState === 'IDLE') {
    return null;
  }

  const isWarming = engineState === 'WARMING';
  const isThrottled = engineState === 'THROTTLED';
  const isBatterySaver = engineState === 'BATTERY_SAVER';
  const isModelUnavailable = engineState === 'MODEL_UNAVAILABLE';
  const label = isBatterySaver
    ? 'Paused: Battery Saver'
    : isModelUnavailable
      ? 'Paused: Gemma model unavailable'
    : isThrottled
      ? 'Paused: High CPU'
      : isWarming
        ? 'Engine Booting'
        : 'Cooldown Active';
  const dotColor = isBatterySaver
    ? 'var(--color-warning)'
    : isModelUnavailable
      ? 'var(--color-warning)'
    : isThrottled
      ? 'var(--color-warning)'
      : isWarming
        ? 'var(--color-accent)'
        : 'var(--color-text-muted)';

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 24,
        padding: '0 8px',
        borderRadius: 8,
        border: '1px solid var(--color-border)',
        background: 'var(--color-panel-elevated)',
        boxShadow: 'var(--shadow-sm)',
        opacity: 1,
        transition: 'opacity 150ms ease',
        zIndex: 20
      }}
      aria-live="polite"
      aria-label={label}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: isWarming ? '0 0 0 6px rgba(111, 126, 168, 0.16)' : 'none'
        }}
      />
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-muted)',
          fontWeight: 600
        }}
      >
        {label}
      </span>
    </div>
  );
}
