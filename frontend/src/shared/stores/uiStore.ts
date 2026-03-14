import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  currentPageTitle: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPageTitle: (title: string) => void;
}

function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem('sidebar_collapsed');
    return stored === 'true';
  } catch {
    return false;
  }
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: getStoredCollapsed(),
  currentPageTitle: 'Dashboard',
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      localStorage.setItem('sidebar_collapsed', String(next));
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (collapsed: boolean) => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },
  setPageTitle: (title: string) => set({ currentPageTitle: title }),
}));