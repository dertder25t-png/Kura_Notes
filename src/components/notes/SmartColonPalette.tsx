import { useEffect, useState } from 'react';
import { LineContext } from '../../utils/lineContext';
import { PaletteAction } from '../../utils/paletteActions';

interface Position {
  x: number;
  y: number;
}

interface Props {
  context: LineContext;
  position: Position | null;
  actions: PaletteAction[];
  selectedIndex: number;
  onSelect: (action: PaletteAction) => void;
  onClose: () => void;
}

const CONTEXT_ACCENTS: Record<LineContext['type'], string> = {
  scripture: 'rgba(167, 139, 250, 0.18)',
  etymology: 'rgba(96, 165, 250, 0.18)',
  formula: 'rgba(251, 191, 36, 0.18)',
  rule: 'rgba(96, 165, 250, 0.16)',
  drug: 'rgba(16, 185, 129, 0.16)',
  labvalue: 'rgba(132, 204, 22, 0.16)',
  mnemonic: 'rgba(236, 72, 153, 0.16)',
  classification: 'rgba(96, 165, 250, 0.16)',
  hierarchy: 'rgba(96, 165, 250, 0.16)',
  case: 'rgba(239, 68, 68, 0.16)',
  definition: 'rgba(96, 165, 250, 0.16)',
  comparison: 'rgba(16, 185, 129, 0.16)',
  date: 'rgba(251, 191, 36, 0.16)',
  nested: 'rgba(148, 163, 184, 0.12)',
  'key-term': 'rgba(148, 163, 184, 0.12)',
  plain: 'rgba(148, 163, 184, 0.1)'
};

export default function SmartColonPalette({ context, position, actions, selectedIndex, onSelect, onClose }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!position) {
    return null;
  }

  return (
    <div
      className="smart-colon-palette"
      style={{
        left: position.x,
        top: position.y + 14,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-8px)',
        borderColor: CONTEXT_ACCENTS[context.type] ?? CONTEXT_ACCENTS.plain
      }}
    >
      <div
        className="smart-colon-palette__header"
        style={{ background: CONTEXT_ACCENTS[context.type] ?? CONTEXT_ACCENTS.plain }}
      >
        <div className="smart-colon-palette__label">{context.label}</div>
        <div className="smart-colon-palette__hint">Enter, 1, 2, 3, or Esc</div>
      </div>

      <div className="smart-colon-palette__actions">
        {actions.map((action, index) => (
          <button
            key={action.id}
            type="button"
            className={`smart-colon-palette__action${index === selectedIndex ? ' is-active' : ''}${action.isPrimary ? ' is-primary' : ''}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(action)}
          >
            <span className="smart-colon-palette__icon" style={{ background: action.iconBg }}>
              {action.icon}
            </span>
            <span className="smart-colon-palette__copy">
              <span className="smart-colon-palette__title">{action.title}</span>
              <span className="smart-colon-palette__subtitle">{action.subtitle}</span>
            </span>
            <span className="smart-colon-palette__key">{index + 1}</span>
          </button>
        ))}
      </div>

      <div className="smart-colon-palette__footer">
        <button className="smart-colon-palette__plain" type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClose}>
          Esc to dismiss
        </button>
      </div>

      <div className="smart-colon-palette__shadow" aria-hidden="true" />
      <div className="smart-colon-palette__glow" aria-hidden="true" />
    </div>
  );
}
