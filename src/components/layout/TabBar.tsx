import { TabPlacement } from '../../types';
import Icon from '../ui/Icon';

export interface NoteTab {
  id: string;
  noteId: number;
  title: string;
}

interface Props {
  tabs: NoteTab[];
  activeTabId: string | null;
  placement: TabPlacement;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export default function TabBar({ tabs, activeTabId, placement, onSelectTab, onCloseTab }: Props) {
  if (tabs.length === 0) {
    return null;
  }

  const isLeft = placement === 'left';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isLeft ? 'column' : 'row',
        gap: 4,
        padding: 8,
        background: 'rgba(255, 255, 255, 0.02)',
        borderRight: isLeft ? '1px solid var(--color-border)' : 'none',
        borderBottom: !isLeft ? '1px solid var(--color-border)' : 'none',
        minWidth: isLeft ? 210 : undefined,
        maxWidth: isLeft ? 210 : undefined,
        overflowX: isLeft ? 'hidden' : 'auto',
        overflowY: isLeft ? 'auto' : 'hidden'
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: isLeft ? 0 : 190,
              border: `1px solid ${isActive ? 'rgba(111, 126, 168, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`,
              borderRadius: 10,
              background: isActive ? 'rgba(111, 126, 168, 0.16)' : 'rgba(255, 255, 255, 0.03)',
              padding: '7px 10px'
            }}
          >
            <button
              onClick={() => onSelectTab(tab.id)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                margin: 0,
                textAlign: 'left',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--color-text)'
              }}
              title={tab.title}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="note" size={14} />
                {tab.title || 'Untitled'}
              </span>
            </button>
            <button
              onClick={() => onCloseTab(tab.id)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                color: 'var(--color-text-muted)'
              }}
              title="Close tab"
            >
              <Icon name="x" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
