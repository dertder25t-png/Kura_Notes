import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolId =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'highlight'
  | 'heading'
  | 'bullet-dash'
  | 'bullet-star'
  | 'numbered'
  | 'quote'
  | 'code'
  | 'smart-colon'
  | 'divider';

export interface ToolDef {
  id: ToolId;
  label: string;
  render: () => React.ReactNode;
}

export interface FormattingToolbarProps {
  noteId: number | null;
  position: 'top' | 'left' | 'off';
  autoHide: boolean;
  peekEnabled: boolean;
  peekDurationMs: number;
  peekFadeInMs: number;
  peekFadeOutMs: number;
  hoverShowMs: number;
  hoverHideMs: number;
  enabledTools: ToolId[];
  onEnabledToolsChange?: (tools: ToolId[]) => void;
}

// ─── Tool Registry ─────────────────────────────────────────────────────────────

const ALL_TOOLS: ToolDef[] = [
  {
    id: 'bold',
    label: 'Bold',
    render: () => <span style={{ fontWeight: 700, fontSize: 14 }}>B</span>,
  },
  {
    id: 'italic',
    label: 'Italic',
    render: () => (
      <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 14 }}>I</span>
    ),
  },
  {
    id: 'strikethrough',
    label: 'Strikethrough',
    render: () => (
      <span style={{ textDecoration: 'line-through', fontSize: 13 }}>S</span>
    ),
  },
  {
    id: 'highlight',
    label: 'Highlight',
    render: () => (
      <span
        style={{
          background: 'rgba(230,169,74,0.35)',
          color: '#e6a94a',
          fontSize: 11,
          padding: '1px 4px',
          borderRadius: 3,
          fontWeight: 600,
        }}
      >
        H
      </span>
    ),
  },
  {
    id: 'heading',
    label: 'Heading',
    render: () => (
      <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: -0.5 }}>H1</span>
    ),
  },
  {
    id: 'bullet-dash',
    label: 'Bullet (—)',
    render: () => (
      <span style={{ fontSize: 15, lineHeight: 1 }}>—</span>
    ),
  },
  {
    id: 'bullet-star',
    label: 'Bullet (*)',
    render: () => (
      <span style={{ fontSize: 15, lineHeight: 1 }}>✦</span>
    ),
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    render: () => (
      <span style={{ fontSize: 11, fontWeight: 600 }}>1.</span>
    ),
  },
  {
    id: 'quote',
    label: 'Quote',
    render: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
      </svg>
    ),
  },
  {
    id: 'code',
    label: 'Code Block',
    render: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'smart-colon',
    label: 'Flashcard (::)',
    render: () => (
      <span style={{ fontSize: 14 }}>⬡</span>
    ),
  },
  {
    id: 'divider',
    label: 'Divider',
    render: () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FormattingToolbar({
  noteId,
  position,
  autoHide,
  peekEnabled,
  peekDurationMs,
  peekFadeInMs,
  peekFadeOutMs,
  hoverShowMs,
  hoverHideMs,
  enabledTools,
  onEnabledToolsChange,
}: FormattingToolbarProps) {
  const [visible, setVisible] = useState(!autoHide);
  const [isHovered, setIsHovered] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const isHoveredRef = useRef(false);
  const peekTimer = useRef<number | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (peekTimer.current) { clearTimeout(peekTimer.current); peekTimer.current = null; }
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }, []);

  // ── Auto-hide logic ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!autoHide) {
      setVisible(true);
      return;
    }

    function onTyping() {
      if (isHoveredRef.current) return;
      clearTimers();
      setVisible(false);
    }

    function onIdle() {
      if (isHoveredRef.current) return;
      if (!peekEnabled) return;
      clearTimers();
      // Peek in
      setVisible(true);
      // Then fade out after hold period
      peekTimer.current = window.setTimeout(() => {
        if (!isHoveredRef.current) setVisible(false);
      }, peekFadeInMs + peekDurationMs);
    }

    window.addEventListener('kura:editor-typing', onTyping);
    window.addEventListener('kura:editor-idle', onIdle);
    return () => {
      window.removeEventListener('kura:editor-typing', onTyping);
      window.removeEventListener('kura:editor-idle', onIdle);
    };
  }, [autoHide, peekEnabled, peekFadeInMs, peekDurationMs, clearTimers]);

  // Reset to correct visibility when autoHide toggle changes
  useEffect(() => {
    if (!autoHide) setVisible(true);
    else if (!isHoveredRef.current) setVisible(false);
  }, [autoHide]);

  // ── Hover handlers ───────────────────────────────────────────────────────────

  function handleMouseEnter() {
    if (!autoHide) return;
    isHoveredRef.current = true;
    setIsHovered(true);
    clearTimers();
    setVisible(true);
  }

  function handleMouseLeave() {
    if (!autoHide) return;
    isHoveredRef.current = false;
    setIsHovered(false);
    hoverTimer.current = window.setTimeout(() => {
      setVisible(false);
    }, 200);
  }

  // ── Action dispatch ──────────────────────────────────────────────────────────

  function dispatch(toolId: ToolId) {
    if (!noteId) return;
    window.dispatchEvent(new CustomEvent('kura:editor-action', { detail: toolId }));
  }

  // ── Derived styles ───────────────────────────────────────────────────────────

  if (position === 'off') return null;

  const isLeft = position === 'left';
  const fadeInMs = isHovered ? hoverShowMs : peekFadeInMs;
  const fadeOutMs = isHovered ? hoverHideMs : peekFadeOutMs;
  const transitionMs = visible ? fadeInMs : fadeOutMs;

  const visibleTools = ALL_TOOLS.filter((t) => enabledTools.includes(t.id));

  // ── Separator insertion logic ─────────────────────────────────────────────────
  // Insert separators after: highlight | heading | numbered | code
  const SEPARATOR_AFTER: ToolId[] = ['highlight', 'heading', 'numbered', 'code'];

  const toolsWithSeparators: Array<ToolDef | 'sep'> = [];
  visibleTools.forEach((tool, i) => {
    toolsWithSeparators.push(tool);
    const nextTool = visibleTools[i + 1];
    if (nextTool && SEPARATOR_AFTER.includes(tool.id)) {
      toolsWithSeparators.push('sep');
    }
  });

  return (
    <>
      {/* Hover detection zone — slightly larger than the visible bar */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute',
          ...(isLeft
            ? { left: 0, top: '50%', transform: 'translateY(-50%)', width: 56, height: '60%' }
            : { top: 0, left: '50%', transform: 'translateX(-50%)', height: 52, width: '80%' }),
          zIndex: 38,
          pointerEvents: 'auto',
        }}
      />

      {/* Manage Tools flyout */}
      {showManage && (
        <div
          style={{
            position: 'absolute',
            ...(isLeft ? { left: 52, top: '50%', transform: 'translateY(-50%)' } : { top: 52, left: '50%', transform: 'translateX(-50%)' }),
            zIndex: 50,
            background: 'rgba(18, 19, 22, 0.97)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: '10px 12px',
            display: 'grid',
            gap: 4,
            minWidth: 190,
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(14px)',
          }}
          onMouseEnter={() => { isHoveredRef.current = true; clearTimers(); }}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Manage Tools
          </div>
          {ALL_TOOLS.map((tool) => {
            const active = enabledTools.includes(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => {
                  if (!onEnabledToolsChange) return;
                  onEnabledToolsChange(
                    active
                      ? enabledTools.filter((id) => id !== tool.id)
                      : [...enabledTools, tool.id]
                  );
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '5px 8px',
                  borderRadius: 7,
                  border: 'none',
                  background: active ? 'rgba(111,126,168,0.12)' : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: 13,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                    {tool.render()}
                  </span>
                  {tool.label}
                </span>
                {/* Toggle pill */}
                <span
                  style={{
                    width: 28,
                    height: 15,
                    borderRadius: 999,
                    background: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 150ms',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: active ? 15 : 2,
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 150ms',
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* The toolbar itself */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute',
          ...(isLeft
            ? { left: 8, top: '50%', transform: 'translateY(-50%)' }
            : { top: 8, left: '50%', transform: 'translateX(-50%)' }),
          display: 'flex',
          flexDirection: isLeft ? 'column' : 'row',
          alignItems: 'center',
          gap: 2,
          padding: isLeft ? '8px 6px' : '6px 10px',
          background: 'rgba(18, 19, 24, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: isLeft ? 14 : 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.04) inset',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transition: `opacity ${transitionMs}ms ease`,
          zIndex: 39,
          userSelect: 'none',
        }}
      >
        {toolsWithSeparators.map((item, i) => {
          if (item === 'sep') {
            return (
              <div
                key={`sep-${i}`}
                style={{
                  [isLeft ? 'width' : 'height']: 14,
                  [isLeft ? 'height' : 'width']: 1,
                  background: 'rgba(255,255,255,0.08)',
                  margin: isLeft ? '3px 0' : '0 3px',
                  flexShrink: 0,
                }}
              />
            );
          }

          const tool = item as ToolDef;
          const isFlashcard = tool.id === 'smart-colon';

          return (
            <ToolButton
              key={tool.id}
              title={tool.label}
              isFlashcard={isFlashcard}
              onClick={() => (tool.id === 'smart-colon' ? dispatch('smart-colon') : dispatch(tool.id))}
            >
              {tool.render()}
            </ToolButton>
          );
        })}

        {/* Separator before manage button */}
        {visibleTools.length > 0 && (
          <div
            style={{
              [isLeft ? 'width' : 'height']: 14,
              [isLeft ? 'height' : 'width']: 1,
              background: 'rgba(255,255,255,0.08)',
              margin: isLeft ? '3px 0' : '0 3px',
              flexShrink: 0,
            }}
          />
        )}

        {/* Manage tools button */}
        <ToolButton
          title="Manage tools"
          isActive={showManage}
          onClick={() => setShowManage((v) => !v)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </ToolButton>
      </div>
    </>
  );
}

// ─── ToolButton ───────────────────────────────────────────────────────────────

function ToolButton({
  onClick,
  title,
  children,
  isFlashcard = false,
  isActive = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  isFlashcard?: boolean;
  isActive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30,
        height: 30,
        padding: 0,
        border: isFlashcard
          ? `1px solid ${hovered ? 'rgba(111,126,168,0.5)' : 'rgba(111,126,168,0.2)'}`
          : '1px solid transparent',
        borderRadius: 7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isActive
          ? 'rgba(111,126,168,0.2)'
          : hovered
          ? 'rgba(255,255,255,0.08)'
          : isFlashcard
          ? 'rgba(111,126,168,0.06)'
          : 'transparent',
        color: isFlashcard
          ? 'var(--color-accent)'
          : hovered
          ? 'var(--color-text)'
          : 'var(--color-text-muted)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 120ms, color 120ms, border-color 120ms',
      }}
    >
      {children}
    </button>
  );
}
