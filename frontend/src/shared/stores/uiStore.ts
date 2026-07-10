import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  currentPageTitle: string;
  /** Active workspace key (e.g. 'device', 'field', 'finance', 'assistant', 'admin'). */
  activeWorkspace: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setPageTitle: (title: string) => void;
  setActiveWorkspace: (key: string) => void;
}

function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem('sidebar_collapsed');
    return stored === 'true';
  } catch {
    return false;
  }
}

function getStoredWorkspace(): string {
  try {
    return localStorage.getItem('active_workspace') || 'device';
  } catch {
    return 'device';
  }
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: getStoredCollapsed(),
  mobileMenuOpen: false,
  currentPageTitle: 'Dashboard',
  activeWorkspace: getStoredWorkspace(),
  setActiveWorkspace: (key: string) => {
    try {
      localStorage.setItem('active_workspace', key);
    } catch {
      /* ignore */
    }
    set({ activeWorkspace: key });
  },
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
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