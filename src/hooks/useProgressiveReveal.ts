import { useState } from 'react';

interface RevealState {
  notesSaved: number;
  flashcardsCreated: number;
  hasUsedSlashMenu: boolean;
  totalWordsTyped: number;
  smartColonUsed: number;
}

const DEFAULT_STATE: RevealState = {
  notesSaved: 0,
  flashcardsCreated: 0,
  hasUsedSlashMenu: false,
  totalWordsTyped: 0,
  smartColonUsed: 0
};

function loadOrDefault(): RevealState {
  try {
    const raw = window.localStorage.getItem('scholr.reveal');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore error
  }
  return DEFAULT_STATE;
}

export function useProgressiveReveal() {
  const [state, setState] = useState<RevealState>(loadOrDefault);

  function bump(key: keyof RevealState, amount: number | boolean = 1) {
    setState(prev => {
      let nextValue = prev[key];
      if (typeof amount === 'number' && typeof nextValue === 'number') {
        nextValue += amount;
      } else if (typeof amount === 'boolean') {
        nextValue = amount as never;
      }
      
      const next = { ...prev, [key]: nextValue };
      window.localStorage.setItem('scholr.reveal', JSON.stringify(next));
      return next;
    });
  }

  const features = {
    showSynthesizeButton:   state.totalWordsTyped > 100,
    showFlashcardHint:      state.notesSaved > 1 && state.flashcardsCreated === 0,
    showStudyModeToggle:    state.flashcardsCreated > 0 || state.notesSaved > 3,
    showOrganizeMode:       state.notesSaved > 5,
    showCommandPaletteHint: state.notesSaved > 2 && !state.hasUsedSlashMenu,
    showSmartColonHint:     state.notesSaved > 1 && state.smartColonUsed === 0,
  };

  return { state, bump, features };
}
