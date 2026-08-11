import { create } from 'zustand';

/**
 * Admin "View as" — preview the app as another role.
 *
 * This changes what is SHOWN and never what is PERMITTED. The store only
 * narrows the client's permission set; every request still carries the real
 * identity and the server still enforces it. A preview therefore cannot become
 * an escalation, and an admin previewing an engineer will see a 403 if they
 * try something the engineer could not do — which is the honest result.
 *
 * Not persisted. A preview that survives a refresh is a trap: you come back
 * tomorrow, see half the app missing, and think it is broken.
 */
interface ViewAsState {
  roleName: string | null;
  permissions: string[] | null;
  setViewAs: (roleName: string, permissions: string[]) => void;
  clear: () => void;
}

export const useViewAsStore = create<ViewAsState>((set) => ({
  roleName: null,
  permissions: null,
  setViewAs: (roleName, permissions) => set({ roleName, permissions }),
  clear: () => set({ roleName: null, permissions: null }),
}));
