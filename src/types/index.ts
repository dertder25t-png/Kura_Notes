export interface ClassItem {
  id: number;
  name: string;
  color: string;
  createdAt?: string;
}

export interface Note {
  id: number;
  classId: number;
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
  classId: number;
  name: string;
  createdAt?: string;
}

export type TabPlacement = 'top' | 'left';

export interface SaveNoteInput {
  classId: number;
  title: string;
  rawContent: string;
}
