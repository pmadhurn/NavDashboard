import { create } from 'zustand';
import type { ThemeMode } from '@/styles/theme';

const STORAGE_KEY = 'nav-theme';

/**
 * Applied to <html>, not <body>: :root is where the tokens live, and setting it
 * on the document element means the background is right before React mounts.
 */
function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme'); // dark is the :root default
}

function initialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  // No explicit choice yet — follow the OS.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const mode = initialMode();
  applyMode(mode);

  return {
    mode,
    setMode: (next) => {
      localStorage.setItem(STORAGE_KEY, next);
      applyMode(next);
      set({ mode: next });
    },
    toggle: () => get().setMode(get().mode === 'dark' ? 'light' : 'dark'),
  };
});
