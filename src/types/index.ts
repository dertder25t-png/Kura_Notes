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
