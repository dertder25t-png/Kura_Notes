import { PointerEvent, useMemo, useRef, useState } from 'react';
import { ToolDefinition, ToolRenderContext } from './toolRegistry';

interface Position {
  x: number;
  y: number;
}

interface Props {
  hidden: boolean;
  onToggleHidden: () => void;
  tools: ToolDefinition[];
  context: ToolRenderContext;
}

const STORAGE_KEY = 'kura.tooldock.position';
const PINNED_KEY = 'kura.tooldock.pinned';

function loadPosition(): Position {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { x: 320, y: 18 };
  }

  try {
    return JSON.parse(raw) as Position;
  } catch {
    return { x: 320, y: 18 };
  }
}

function savePosition(value: Position) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function loadPinnedTools(tools: ToolDefinition[]): string[] {
  const raw = window.localStorage.getItem(PINNED_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as string[];
      return parsed;
    } catch {
      return [];
    }
  }

  return tools.filter((tool) => tool.defaultPinned).map((tool) => tool.id);
}

function savePinnedTools(ids: string[]) {
  window.localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

export default function ToolDock({ hidden, onToggleHidden, tools, context }: Props) {
  const [position, setPosition] = useState<Position>(loadPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [pinned, setPinned] = useState<string[]>(() => loadPinnedTools(tools));
  const dragOffset = useRef<Position>({ x: 0, y: 0 });

  const groupedTools = useMemo(() => {
    const groups: Record<string, ToolDefinition[]> = {};
    for (const tool of tools) {
      if (!groups[tool.group]) {
        groups[tool.group] = [];
      }
      groups[tool.group].push(tool);
    }
    return groups;
  }, [tools]);

  const pinnedTools = useMemo(() => tools.filter((tool) => pinned.includes(tool.id)), [tools, pinned]);

  function togglePin(toolId: string) {
    setPinned((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      savePinnedTools(next);
      return next;
    });
  }

  function onDragStart(event: PointerEvent<HTMLDivElement>) {
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y
    };
    setIsDragging(true);
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  }

  function onDragMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    const next = {
      x: Math.max(10, event.clientX - dragOffset.current.x),
      y: Math.max(10, event.clientY - dragOffset.current.y)
    };

    setPosition(next);
    savePosition(next);
  }

  function onDragEnd(event: PointerEvent<HTMLDivElement>) {
    setIsDragging(false);
    (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
  }

  if (hidden) {
    return (
      <button
        onClick={onToggleHidden}
        style={{
          position: 'fixed',
          right: 18,
          top: 18,
          zIndex: 100,
          background: '#1f2f2c',
          color: '#f5f7f5',
          borderColor: '#324b46'
        }}
      >
        Show Toolbar
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 100,
        width: 250,
        border: '1px solid #3b544d',
        borderRadius: 12,
        background: '#182826',
        color: '#f0f5f3',
        boxShadow: '0 8px 18px rgba(0,0,0,0.25)'
      }}
    >
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          borderBottom: '1px solid #2f4741',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <strong style={{ fontSize: 13, letterSpacing: 0.2 }}>Tool Dock</strong>
        <button
          onClick={onToggleHidden}
          style={{ background: 'transparent', borderColor: '#48645d', color: '#e0ece8', padding: '3px 8px' }}
        >
          Hide
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8, padding: 10 }}>
        {pinnedTools.length > 0 && (
          <section style={{ display: 'grid', gap: 6, padding: 8, border: '1px solid #2f4741', borderRadius: 10 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9db6ad' }}>
              Pinned
            </div>
            {pinnedTools.map((tool) => (
              <div key={tool.id} style={{ display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#c9ddd5' }}>{tool.label}</span>
                  <button
                    onClick={() => togglePin(tool.id)}
                    style={{ padding: '2px 6px', fontSize: 11, background: '#203430', color: '#d6e4de', borderColor: '#37554d' }}
                  >
                    Unpin
                  </button>
                </div>
                {tool.render(context)}
              </div>
            ))}
          </section>
        )}

        {Object.entries(groupedTools).map(([groupName, items]) => (
          <section key={groupName} style={{ display: 'grid', gap: 6, padding: 8, border: '1px solid #2f4741', borderRadius: 10 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9db6ad' }}>
              {groupName}
            </div>
            {items.map((tool) => (
              <div key={tool.id} style={{ display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#c9ddd5' }}>{tool.label}</span>
                  <button
                    onClick={() => togglePin(tool.id)}
                    style={{ padding: '2px 6px', fontSize: 11, background: '#203430', color: '#d6e4de', borderColor: '#37554d' }}
                  >
                    {pinned.includes(tool.id) ? 'Pinned' : 'Pin'}
                  </button>
                </div>
                {tool.render(context)}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
