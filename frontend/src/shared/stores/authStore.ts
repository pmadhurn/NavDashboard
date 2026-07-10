import { create } from 'zustand'

export type PermissionLevel = 'NONE' | 'VIEW' | 'EDIT' | 'MANAGE'
export type PermissionMap = Record<string, PermissionLevel>

interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  auth_provider?: string
  status?: string
  permissions?: PermissionMap
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token: string, user: User) => {
    localStorage.setItem('access_token', token)
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    set({ token: null, user: null, isAuthenticated: false })
  },

  initialize: () => {
    const token = localStorage.getItem('access_token')
    if (token && !get().isAuthenticated) {
      set({ token, isAuthenticated: true })
    }
  },
}))

const LEVEL_ORDER: Record<PermissionLevel, number> = {
  NONE: 0,
  VIEW: 1,
  EDIT: 2,
  MANAGE: 3,
}

/** True if the current user has at least `level` on `section`. ADMIN always passes. */
export function hasPermission(
  user: User | null,
  section: string,
  level: PermissionLevel = 'VIEW'
): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  const userLevel = user.permissions?.[section] ?? 'NONE'
  return LEVEL_ORDER[userLevel] >= LEVEL_ORDER[level]
}

/** Hook version for components. */
export function usePermission(section: string, level: PermissionLevel = 'VIEW'): boolean {
  const user = useAuthStore((s) => s.user)
  return hasPermission(user, section, level)
}
