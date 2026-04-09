import NoteEditor from './NoteEditor';
import StudyPanel from './StudyPanel';
import FlashcardBuilder from '../flashcards/FlashcardBuilder';

interface Props {
  noteId: number | null;
  classId: number | null;
  rightPanel: RightPanel;
}

type RightPanel = 'study' | 'flashcards';

export default function DualPane({ noteId, classId, rightPanel }: Props) {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1.5, borderRight: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <NoteEditor noteId={noteId} classId={classId} />
        </div>

        <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
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
