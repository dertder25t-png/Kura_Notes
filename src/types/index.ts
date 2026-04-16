export interface ClassItem {
  id: number;
  name: string;
  color: string;
  createdAt?: string;
}

export interface Note {
  id: number;
  classId?: number | null;
  folderId?: number | null;
  title: string;
  rawContent: string;
  studyContent: string;
  audioTranscript: string;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: number;
  noteId?: number | null;
  classId?: number | null;
  sourceLineIndex: number;
  contextType: string;
  contextLabel: string;
  front: string;
  back: string;
  sourceLine: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem {
  id: number;
  classId?: number | null;
  name: string;
  createdAt?: string;
}

export type TabPlacement = 'top' | 'left';
export type NavPlacement = 'left' | 'top';
export type CanvasLayoutMode = 'grid' | 'column' | 'free';
export type QuickActionsMode = 'rail' | 'island';

export type AppMode = 'focus' | 'study' | 'organize';

export interface UIState {
  mode: AppMode;
}

export interface SaveNoteInput {
  classId: number;
  title: string;
  rawContent: string;
}

export type ToolbarPosition = 'top' | 'left' | 'off';

export type ToolbarToolId =
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

export const ALL_TOOLBAR_TOOL_IDS: ToolbarToolId[] = [
  'bold', 'italic', 'strikethrough', 'highlight',
  'heading',
  'bullet-dash', 'bullet-star', 'numbered', 'quote',
  'code', 'smart-colon', 'divider',
];

export interface ToolbarConfig {
  position: ToolbarPosition;
  autoHide: boolean;
  peekEnabled: boolean;
  peekDurationMs: number;
  peekFadeInMs: number;
  peekFadeOutMs: number;
  hoverShowMs: number;
  hoverHideMs: number;
  enabledTools: ToolbarToolId[];
}

export interface AiModelOption {
  name: string;
  sizeBytes?: number | null;
}

export interface AiBenchmarkResult {
  model: string;
  latencyMs: number;
  score: number;
  success: boolean;
  error?: string | null;
}

export interface AiSetupSnapshot {
  selectedModel?: string | null;
  ollamaUrl: string;
  onboardingComplete: boolean;
  availableModels: AiModelOption[];
  currentModel?: string | null;
  recommendedModel?: string | null;
  connectionStatus: string;
  connectionError?: string | null;
}

export interface AiBenchmarkSummary {
  results: AiBenchmarkResult[];
  recommendedModel?: string | null;
}
