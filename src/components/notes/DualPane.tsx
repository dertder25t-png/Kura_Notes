import { useEffect, useState } from 'react';
import NoteEditor from './NoteEditor';
import StudyPanel from './StudyPanel';
import FlashcardBuilder from '../flashcards/FlashcardBuilder';
import { AppMode, ToolbarConfig, ToolbarToolId } from '../../types';

interface Props {
  noteId: number | null;
  classId: number | null;
  rightPanel?: RightPanel;
  mode: AppMode;
  onSetRightPanel?: (panel: RightPanel) => void;
  toolbarConfig?: ToolbarConfig;
  onToolbarEnabledToolsChange?: (tools: ToolbarToolId[]) => void;
}

type RightPanel = 'study' | 'flashcards';

export default function DualPane({ noteId, classId, rightPanel, onSetRightPanel, mode, toolbarConfig, onToolbarEnabledToolsChange }: Props) {
  const [isFlashcardsFullscreen, setIsFlashcardsFullscreen] = useState(false);

  useEffect(() => {
    if (rightPanel !== 'flashcards' || mode !== 'study') {
      setIsFlashcardsFullscreen(false);
    }
  }, [rightPanel, mode]);

  const showFlashcards = rightPanel === 'flashcards';
  const isRightPanelFullscreen = showFlashcards && isFlashcardsFullscreen;

  if (mode === 'focus') {
    return (
      <div style={{ height: '100%', display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)', background: 'var(--color-panel)' }}>
        <div
          style={{
            width: 'min(100%, 1150px)',
            height: '100%',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--color-border)',
            backdropFilter: 'blur(3px)'
          }}
        >
          <NoteEditor noteId={noteId} classId={classId} appMode={mode} toolbarConfig={toolbarConfig} onToolbarEnabledToolsChange={onToolbarEnabledToolsChange} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            flex: isRightPanelFullscreen ? 0 : 1.4,
            borderRight: isRightPanelFullscreen ? 'none' : '1px solid var(--color-border)',
            overflow: 'hidden',
            transition: 'flex 200ms ease',
            minWidth: isRightPanelFullscreen ? 0 : undefined,
            opacity: isRightPanelFullscreen ? 0 : 1,
            pointerEvents: isRightPanelFullscreen ? 'none' : 'auto'
          }}
        >
          <NoteEditor noteId={noteId} classId={classId} appMode={mode} toolbarConfig={toolbarConfig} onToolbarEnabledToolsChange={onToolbarEnabledToolsChange} />
        </div>

        <div
          style={{
            flex: isRightPanelFullscreen ? 1 : 1,
            overflow: 'hidden',
            background: 'var(--color-panel)',
            transform: 'translateX(0)',
            opacity: 1,
            transition: 'transform 220ms ease, opacity 220ms ease'
          }}
        >
          {rightPanel === 'study' ? (
            <StudyPanel noteId={noteId} />
          ) : (
            <FlashcardBuilder
              noteId={noteId}
              isFullscreen={isRightPanelFullscreen}
              onToggleFullscreen={() => setIsFlashcardsFullscreen((prev) => !prev)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
