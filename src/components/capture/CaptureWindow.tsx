import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke, isTauriRuntime } from '../../utils/invoke';
import Icon from '../ui/Icon';

function parseCaptureInput(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { content: '', tag: null as string | null };
  }

  const tagMatch = trimmed.match(/^#([a-z0-9_-]+)\s+(.*)$/i);
  if (tagMatch) {
    return { tag: tagMatch[1], content: tagMatch[2].trim() };
  }

  return { content: trimmed, tag: null };
}

async function closeCaptureWindow() {
  if (isTauriRuntime) {
    await getCurrentWebviewWindow().close();
    return;
  }

  window.location.assign('/');
}

export default function CaptureWindow() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    if (!isTauriRuntime) {
      const onClose = () => {
        void closeCaptureWindow();
      };

      window.addEventListener('kura:close-capture-window', onClose as EventListener);
      return () => window.removeEventListener('kura:close-capture-window', onClose as EventListener);
    }

    let unlistenClose: (() => void) | null = null;
    let unlistenInvalidation: (() => void) | null = null;

    void listen('kura:close-capture-window', () => {
      void closeCaptureWindow();
    }).then((unlisten) => {
      unlistenClose = unlisten;
    });

    void listen('kura:data-invalidated', () => {
      setValue('');
      setStatus('saved');
      window.setTimeout(() => setStatus('idle'), 900);
    }).then((unlisten) => {
      unlistenInvalidation = unlisten;
    });

    return () => {
      unlistenClose?.();
      unlistenInvalidation?.();
    };
  }, []);

  async function handleSubmit() {
    const parsed = parseCaptureInput(value);
    if (!parsed.content || status === 'saving') {
      return;
    }

    setStatus('saving');

    try {
      await invoke('quick_capture', {
        content: parsed.content,
        tag: parsed.tag
      });
    } catch {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 1200);
    }
  }

  return (
    <div className="capture-shell">
      <div className="capture-glow capture-glow-left" />
      <div className="capture-glow capture-glow-right" />

      <section className="capture-panel" role="dialog" aria-label="Quick capture">
        <div className="capture-topline">
          <div className="capture-brand">
            <Icon name="sparkles" size={14} />
            <span>Quick Capture</span>
          </div>
          <div className="capture-status" data-state={status}>
            {status === 'idle' && 'Cmd/Ctrl + Shift + Space'}
            {status === 'saving' && 'Saving...'}
            {status === 'saved' && 'Saved'}
            {status === 'error' && 'Could not save'}
          </div>
        </div>

        <input
          ref={inputRef}
          className="capture-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleSubmit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              void closeCaptureWindow();
            }
          }}
          placeholder="Capture a thought. Start with #tag if you want routing..."
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />

        <div className="capture-footer">
          <span>Enter to save</span>
          <span>Esc to close</span>
          <span>#tag optional</span>
        </div>
      </section>
    </div>
  );
}