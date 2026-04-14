import { ClassItem, FolderItem, Note } from '../types';

interface MockDB {
  classes: ClassItem[];
  folders: FolderItem[];
  notes: Note[];
}

function getDb(): MockDB {
  const data = localStorage.getItem('scholr_mock_db');
  if (data) return JSON.parse(data);
  return { classes: [], folders: [], notes: [] };
}

function saveDb(db: MockDB) {
  localStorage.setItem('scholr_mock_db', JSON.stringify(db));
}

function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export async function mockInvoke(cmd: string, args: Record<string, any> = {}): Promise<any> {
    const db = getDb();
    
    // Simulate slight network latency to match real backend
    await new Promise(r => setTimeout(r, 30));
    
    switch (cmd) {
        case 'bootstrap_first_launch': {
            if (db.classes.length > 0) return { alreadyDone: true, noteId: null };
            
            const classId = generateId();
            db.classes.push({ id: classId, name: 'My Notes', color: '#6f7ea8', createdAt: new Date().toISOString() });
            
            const folderId = generateId();
            db.folders.push({ id: folderId, classId, name: 'Inbox', createdAt: new Date().toISOString() });
            
            const noteId = generateId();
            const welcomeNote = `## Welcome to Scholr

Start writing here — this is your note.

**Quick things to try:**

- Type \`#\` then Space → heading
- Type \`-\` then Space → bullet list
- Type \`/\` on a blank line → command menu
- Highlight any text → toolbar appears for flashcards

**The :: trick (works in any subject):**
What is apologetics? :: Knowing what we believe and why, and being able to communicate it effectively

That line just created a flashcard. Try it with dates, formulas, drug names, Bible verses — the app detects the type automatically.

**When your notes are ready:**
Click ✦ Synthesize to generate a clean study guide from this note.

---
*Delete this note whenever you're ready.*
`;
            db.notes.push({
                id: noteId,
                classId,
                folderId,
                title: 'Welcome to Scholr',
                rawContent: welcomeNote,
                studyContent: '',
                audioTranscript: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            saveDb(db);
            return { alreadyDone: false, noteId };
        }
        
        case 'list_classes': return db.classes;
        case 'create_class': {
            const newClass = { id: generateId(), name: args.name, color: args.color, createdAt: new Date().toISOString() };
            db.classes.push(newClass);
            saveDb(db);
            return newClass;
        }
        case 'update_class': {
            const cls = db.classes.find(c => c.id === args.classId);
            if (cls) {
               if (args.name) cls.name = args.name;
               if (args.color) cls.color = args.color;
               saveDb(db);
            }
            return cls;
        }
        case 'delete_class': {
            db.classes = db.classes.filter(c => c.id !== args.classId);
            db.folders = db.folders.filter(f => f.classId !== args.classId);
            db.notes = db.notes.filter(n => n.classId !== args.classId);
            saveDb(db);
            return null;
        }
        
        case 'list_folders': {
            if (args.classId !== undefined && args.classId !== null) {
                 return db.folders.filter(f => f.classId === args.classId);
            }
            return db.folders;
        }
        case 'create_folder': {
            const newFolder = { id: generateId(), classId: args.classId, name: args.name, createdAt: new Date().toISOString() };
            db.folders.push(newFolder);
            saveDb(db);
            return newFolder;
        }
        case 'rename_folder': {
            const folder = db.folders.find(f => f.id === args.folderId);
            if (folder && args.name) {
                folder.name = args.name;
                saveDb(db);
            }
            return folder;
        }
        case 'delete_folder': {
            db.folders = db.folders.filter(f => f.id !== args.folderId);
            db.notes = db.notes.filter(n => n.folderId !== args.folderId);
            saveDb(db);
            return null;
        }
        
        case 'list_notes': {
            if (args.classId !== undefined && args.classId !== null) {
                return db.notes.filter(n => n.classId === args.classId);
            }
            return db.notes;
        }
        case 'list_notes_by_folder': {
            return db.notes.filter(n => n.folderId === args.folderId);
        }
        case 'load_note': {
            const note = db.notes.find(n => n.id === args.noteId);
            if (!note) throw new Error(`Note not found: ${args.noteId}`);
            return note;
        }
        case 'save_note': {
            if (args.noteId) {
                const note = db.notes.find(n => n.id === args.noteId);
                if (note) {
                    if (args.title !== undefined) note.title = args.title;
                    if (args.rawContent !== undefined) note.rawContent = args.rawContent;
                    note.updatedAt = new Date().toISOString();
                    saveDb(db);
                    return note;
                }
            }
            const newNote = {
                id: generateId(),
                classId: args.classId,
                folderId: args.folderId,
                title: args.title || 'Untitled',
                rawContent: args.rawContent || '',
                studyContent: '',
                audioTranscript: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.notes.push(newNote);
            saveDb(db);
            return newNote;
        }
        case 'move_note_to_folder': {
            const note = db.notes.find(n => n.id === args.noteId);
            if (note) {
                note.folderId = args.folderId;
                if (args.classId !== undefined) note.classId = args.classId;
                saveDb(db);
            }
            return note;
        }
        case 'delete_note': {
            db.notes = db.notes.filter(n => n.id !== args.noteId);
            saveDb(db);
            return null;
        }
        default:
            throw new Error(`Mock command not implemented: ${cmd}`);
    }
}
