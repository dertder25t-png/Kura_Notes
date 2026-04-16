import { AiBenchmarkSummary, AiSetupSnapshot, ClassItem, Flashcard, FolderItem, Note } from '../types';

interface MockDB {
  classes: ClassItem[];
  folders: FolderItem[];
  notes: Note[];
    flashcards: Flashcard[];
}

interface MockAiSettings {
    selectedModel: string | null;
    ollamaUrl: string;
    onboardingComplete: boolean;
}

const AI_SETTINGS_KEY = 'scholr_mock_ai_settings';

function loadAiSettings(): MockAiSettings {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as Partial<MockAiSettings>;
            return {
                selectedModel: parsed.selectedModel ?? null,
                ollamaUrl: parsed.ollamaUrl ?? 'http://127.0.0.1:11434',
                onboardingComplete: parsed.onboardingComplete ?? false,
            };
        } catch {
            // ignore malformed mock settings
        }
    }

    return {
        selectedModel: null,
        ollamaUrl: 'http://127.0.0.1:11434',
        onboardingComplete: false,
    };
}

function saveAiSettings(settings: MockAiSettings) {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

function mockModels(): Array<{ name: string; sizeBytes: number }> {
    return [
        { name: 'gemma3:latest', sizeBytes: 4_000_000_000 },
        { name: 'gemma2:latest', sizeBytes: 2_700_000_000 },
        { name: 'gemma:latest', sizeBytes: 1_800_000_000 },
    ];
}

function scoreMockModel(sizeBytes: number, latencyMs: number): number {
    return 120000 / Math.max(latencyMs, 1) + 8000000000 / sizeBytes;
}

function getDb(): MockDB {
  const data = localStorage.getItem('scholr_mock_db');
    if (data) {
        const parsed = JSON.parse(data) as Partial<MockDB>;
        return {
            classes: parsed.classes ?? [],
            folders: parsed.folders ?? [],
            notes: parsed.notes ?? [],
            flashcards: parsed.flashcards ?? []
        };
    }
    return { classes: [], folders: [], notes: [], flashcards: [] };
}

function saveDb(db: MockDB) {
  localStorage.setItem('scholr_mock_db', JSON.stringify(db));
}

function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function ensureDefaultWorkspace(db: MockDB) {
    let classItem = db.classes[0];
    if (!classItem) {
        classItem = {
            id: generateId(),
            name: 'My Notes',
            color: '#6f7ea8',
            createdAt: new Date().toISOString()
        };
        db.classes.push(classItem);
    }

    let inbox = db.folders.find((folder) => folder.classId === classItem.id && folder.name === 'Inbox');
    if (!inbox) {
        inbox = {
            id: generateId(),
            classId: classItem.id,
            name: 'Inbox',
            createdAt: new Date().toISOString()
        };
        db.folders.push(inbox);
    }

    return { classId: classItem.id, folderId: inbox.id };
}

function captureTitle() {
    return `Inbox ${new Date().toISOString().slice(0, 10)}`;
}

function normalizeCaptureContent(content: string, tag?: string | null) {
    const cleaned = content.trim().replace(/\r\n/g, '\n');
    if (!cleaned) {
        return '';
    }

    const safeTag = tag?.trim().replace(/^#/, '');
    const lines = cleaned.split('\n');
    const firstLine = lines.shift()?.trim() ?? '';
    const prefix = safeTag ? `- #${safeTag} ${firstLine}` : `- ${firstLine}`;
    const continuation = lines.map((line) => `  ${line.trim()}`);
    return [prefix, ...continuation].join('\n');
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
        case 'quick_capture': {
            const { classId, folderId } = ensureDefaultWorkspace(db);
            const title = captureTitle();
            const entry = normalizeCaptureContent(args.content ?? '', args.tag ?? null);

            if (!entry) {
                throw new Error('Capture content cannot be empty');
            }

            const note = db.notes.find(n => n.classId === classId && n.folderId === folderId && n.title === title);
            if (note) {
                note.rawContent = note.rawContent.trim()
                    ? `${note.rawContent.trimEnd()}\n${entry}`
                    : entry;
                note.updatedAt = new Date().toISOString();
                saveDb(db);
            } else {
                db.notes.push({
                    id: generateId(),
                    classId,
                    folderId,
                    title,
                    rawContent: entry,
                    studyContent: '',
                    audioTranscript: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                saveDb(db);
            }

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('kura:data-invalidated'));
                window.dispatchEvent(new CustomEvent('kura:close-capture-window'));
            }

            return { noteId: note?.id ?? db.notes[db.notes.length - 1].id, title };
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
            db.flashcards = db.flashcards.filter((card) => card.noteId !== args.noteId);
            saveDb(db);
            return null;
        }

        case 'create_flashcard': {
            const now = new Date().toISOString();
            const metadataRaw = typeof args.metadataJson === 'string' ? args.metadataJson : '{}';
            const card: Flashcard = {
                id: generateId(),
                noteId: args.noteId ?? null,
                classId: args.classId ?? null,
                sourceLineIndex: Number(args.sourceLineIndex ?? 0),
                contextType: String(args.contextType ?? 'manual'),
                contextLabel: String(args.contextLabel ?? 'Manual'),
                front: String(args.front ?? ''),
                back: String(args.back ?? ''),
                sourceLine: String(args.sourceLine ?? ''),
                metadata: (() => {
                    try {
                        return JSON.parse(metadataRaw) as Record<string, unknown>;
                    } catch {
                        return {};
                    }
                })(),
                createdAt: now,
                updatedAt: now,
            };
            db.flashcards.unshift(card);
            saveDb(db);
            return card;
        }

        case 'list_flashcards': {
            const noteId = args.noteId ?? null;
            const classId = args.classId ?? null;
            return db.flashcards.filter((card) => {
                const noteMatch = noteId === null || card.noteId === noteId;
                const classMatch = classId === null || card.classId === classId;
                return noteMatch && classMatch;
            });
        }

        case 'delete_flashcard': {
            db.flashcards = db.flashcards.filter((card) => card.id !== args.cardId);
            saveDb(db);
            return null;
        }

        case 'log_telemetry_event': {
            const key = 'scholr_mock_telemetry';
            const existing = localStorage.getItem(key);
            const events = existing ? JSON.parse(existing) as Array<Record<string, unknown>> : [];
            events.push({
                eventType: args.eventType,
                noteId: args.noteId ?? null,
                metadataJson: args.metadataJson ?? '{}',
                createdAt: new Date().toISOString()
            });
            localStorage.setItem(key, JSON.stringify(events));
            return null;
        }

        case 'process_idle_chunk': {
            const chunk = String(args.chunk ?? '').trim();
            if (chunk.length < 150) {
                return 'SKIPPED_HEURISTICS';
            }
            return 'GENERATION_READY:0.85';
        }

        case 'get_ai_setup_state': {
            const settings = loadAiSettings();
            const models = mockModels();
            return {
                selectedModel: settings.selectedModel,
                ollamaUrl: settings.ollamaUrl,
                onboardingComplete: settings.onboardingComplete,
                availableModels: models,
                currentModel: settings.selectedModel,
                recommendedModel: settings.selectedModel ?? models[0]?.name ?? null,
                connectionStatus: 'ready',
                connectionError: null,
            } satisfies AiSetupSnapshot;
        }

        case 'save_ai_settings': {
            const input = args.input ?? {};
            const settings = {
                selectedModel: input.selectedModel ?? null,
                ollamaUrl: input.ollamaUrl ?? 'http://127.0.0.1:11434',
                onboardingComplete: Boolean(input.onboardingComplete),
            } satisfies MockAiSettings;
            saveAiSettings(settings);

            const models = mockModels();
            return {
                selectedModel: settings.selectedModel,
                ollamaUrl: settings.ollamaUrl,
                onboardingComplete: settings.onboardingComplete,
                availableModels: models,
                currentModel: settings.selectedModel,
                recommendedModel: settings.selectedModel ?? models[0]?.name ?? null,
                connectionStatus: 'ready',
                connectionError: null,
            } satisfies AiSetupSnapshot;
        }

        case 'benchmark_ai_models': {
            const models = mockModels();
            const results = models.map((model, index) => {
                const latencyMs = 700 + index * 250 + Math.round(model.sizeBytes / 10_000_000);
                return {
                    model: model.name,
                    latencyMs,
                    score: scoreMockModel(model.sizeBytes, latencyMs),
                    success: true,
                    error: null,
                };
            }).sort((left, right) => right.score - left.score);

            const recommendedModel = results[0]?.model ?? null;
            saveAiSettings({
                ...loadAiSettings(),
                selectedModel: recommendedModel,
                onboardingComplete: true,
            });

            return { results, recommendedModel } satisfies AiBenchmarkSummary;
        }

        default:
            throw new Error(`Mock command not implemented: ${cmd}`);
    }
}
