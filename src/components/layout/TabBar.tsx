import { TabPlacement } from '../../types';

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
        gap: 6,
        padding: 8,
        background: '#f2eee4',
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
              border: `1px solid ${isActive ? '#36574f' : '#bec8bc'}`,
              borderRadius: 10,
              background: isActive ? '#ffffff' : '#e7ece4',
              padding: '8px 10px'
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
                color: '#172420'
              }}
              title={tab.title}
            >
              {tab.title || 'Untitled'}
            </button>
            <button
              onClick={() => onCloseTab(tab.id)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                color: '#6c786f'
              }}
              title="Close tab"
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}
