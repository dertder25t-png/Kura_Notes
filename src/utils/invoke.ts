import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { mockInvoke } from './mockBackend';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function invoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isTauri) {
    return tauriInvoke<T>(cmd, args);
  }
  return mockInvoke(cmd, args) as Promise<T>;
}
