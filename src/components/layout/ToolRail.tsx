import { useState, useRef, useEffect } from 'react';
import { AppMode } from '../../types';
import Icon from '../ui/Icon';

interface Props {
  appMode: AppMode;
  onSetAppMode: (mode: AppMode) => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onCreateClass: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function ToolRail({
  appMode,
  onSetAppMode,
  isSettingsOpen,
  onToggleSettings,
  onCreateNote,
  onCreateFolder,
  onCreateClass,
  onMouseEnter,
  onMouseLeave
}: Props) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    }
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: 56,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: 16,
        background: 'var(--color-bg)',
        borderRight: '1px solid var(--color-border)',
        zIndex: 50,
      }}
    >
      <div
        ref={actionMenuRef}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <button
          onClick={() => setIsActionsOpen(!isActionsOpen)}
          title="New..."
          style={{
            width: 40,
            height: 40,
            padding: 0,
            borderRadius: 'var(--radius-full)',
            background: isActionsOpen ? 'var(--color-accent-dim)' : 'transparent',
            color: isActionsOpen ? 'var(--color-accent)' : 'var(--color-text)',
            border: `1px solid ${isActionsOpen ? 'transparent' : 'var(--color-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={18} />
        </button>

        {isActionsOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 56,
              minWidth: 160,
              padding: 8,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-panel-elevated)',
              backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              zIndex: 100
            }}
          >
            <button onClick={() => { onCreateNote(); setIsActionsOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="note" size={14} /> New Note
            </button>
            <button onClick={() => { onCreateFolder(); setIsActionsOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="folder-plus" size={14} /> New Folder
            </button>
            <button onClick={() => { onCreateClass(); setIsActionsOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="plus" size={14} /> New Class
            </button>
          </div>
        )}
      </div>

      <div style={{ width: '24px', height: '1px', background: 'var(--color-border)' }} />

      <button
        onClick={() => onSetAppMode('focus')}
        title="Focus Mode"
        style={{
          width: 40,
          height: 40,
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: appMode === 'focus' ? 'var(--color-text)' : 'transparent',
          color: appMode === 'focus' ? 'var(--color-bg)' : 'var(--color-text-muted)'
        }}
      >
        <Icon name="focus" size={18} />
      </button>

      <button
        onClick={() => onSetAppMode('study')}
        title="Study Mode"
        style={{
          width: 40,
          height: 40,
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: appMode === 'study' ? 'var(--color-text)' : 'transparent',
          color: appMode === 'study' ? 'var(--color-bg)' : 'var(--color-text-muted)'
        }}
      >
        <Icon name="study" size={18} />
      </button>

      <button
        onClick={() => onSetAppMode('organize')}
        title="Organize Mode"
        style={{
          width: 40,
          height: 40,
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: appMode === 'organize' ? 'var(--color-panel-soft)' : 'transparent',
          color: appMode === 'organize' ? 'var(--color-text)' : 'var(--color-text-muted)',
          border: appMode === 'organize' ? '1px solid var(--color-border)' : '1px solid transparent'
        }}
      >
        <Icon name="organize" size={18} />
      </button>

      <div style={{ flex: 1 }} />

      <button
        onClick={onToggleSettings}
        title="Settings"
        style={{
          width: 40,
          height: 40,
          padding: 0,
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isSettingsOpen ? 'var(--color-accent-dim)' : 'transparent',
          color: isSettingsOpen ? 'var(--color-accent)' : 'var(--color-text-muted)'
        }}
      >
        <Icon name="settings" size={18} />
      </button>
    </div>
  );
}
