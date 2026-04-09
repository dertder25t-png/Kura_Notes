import NoteEditor from './NoteEditor';
import StudyPanel from './StudyPanel';
import FlashcardBuilder from '../flashcards/FlashcardBuilder';
import { AppMode } from '../../types';

interface Props {
  noteId: number | null;
  classId: number | null;
  rightPanel: RightPanel;
  mode: AppMode;
}

type RightPanel = 'study' | 'flashcards';

export default function DualPane({ noteId, classId, rightPanel, mode }: Props) {
  if (mode === 'focus') {
    return (
      <div style={{ height: '100%', display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
        <div
          style={{
            width: 'min(100%, 1150px)',
            height: '100%',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.56)',
            backdropFilter: 'blur(3px)'
          }}
        >
          <NoteEditor noteId={noteId} classId={classId} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            flex: 1.4,
            borderRight: '1px solid var(--color-border)',
            overflow: 'hidden',
            transition: 'flex 200ms ease'
          }}
        >
          <NoteEditor noteId={noteId} classId={classId} />
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            background: '#fff',
            transform: 'translateX(0)',
            opacity: 1,
            transition: 'transform 220ms ease, opacity 220ms ease'
          }}
        >
          {rightPanel === 'study' ? (
            <StudyPanel noteId={noteId} />
          ) : (
            <FlashcardBuilder noteId={noteId} />
          )}
        </div>
      </div>
    </div>
  );
}
