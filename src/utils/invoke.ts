import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { mockInvoke } from './mockBackend';

export const isTauriRuntime = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function invoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isTauriRuntime) {
    return tauriInvoke<T>(cmd, args);
  }
  return mockInvoke(cmd, args) as Promise<T>;
}

export async function logTelemetryEvent(
  eventType: string,
  noteId?: number | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  await invoke<void>('log_telemetry_event', {
    eventType,
    noteId: noteId ?? null,
    metadataJson: JSON.stringify(metadata ?? {})
  });
}

export async function processIdleChunk(chunk: string, noteId?: number | null): Promise<string> {
  return invoke<string>('process_idle_chunk', {
    chunk,
    noteId: noteId ?? null
  });
}
