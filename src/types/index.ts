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
