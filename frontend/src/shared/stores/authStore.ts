import { create } from 'zustand'
import { useViewAsStore } from './viewAsStore'

/**
 * A permission key from the backend catalog, e.g. 'devices.read',
 * 'finance.settle'. The server is the authority; these gate what is *shown*,
 * and every request is checked again server-side, so hiding a control is a
 * courtesy and never the security boundary.
 */
export type PermissionKey = string

/** Retained for the few call sites still typed against the old model. */
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
  permissions?: PermissionKey[]
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  initialize: () => void
}

const TOKEN_KEY = 'access_token'
const USER_KEY = 'auth_user'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

// Hydrate synchronously at store creation so a page refresh does not bounce an
// authenticated user to /login before any effect has a chance to run.
const storedToken = localStorage.getItem(TOKEN_KEY)
const storedUser = storedToken ? readStoredUser() : null

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  user: storedUser,
  isAuthenticated: Boolean(storedToken),

  setAuth: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null, isAuthenticated: false })
  },

  initialize: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && !get().isAuthenticated) {
      set({ token, user: readStoredUser(), isAuthenticated: true })
    }
  },
}))

/**
 * True if the user holds `key`.
 *
 * Fails closed on a null user: that is the state when the cached auth_user
 * entry is missing, and treating it as "allow" is how a permission check
 * quietly stops being one.
 *
 * ADMIN short-circuits, mirroring `effective_permissions()` on the server. The
 * two must agree or the UI will offer actions the API refuses.
 */
export function can(user: User | null, key: PermissionKey): boolean {
  if (!user) return false

  // While previewing another role, answer as that role would. This narrows the
  // UI only — every request still carries the real identity and the server
  // still enforces it, so a preview can never grant anything.
  const preview = viewAsPermissions()
  if (preview) return preview.includes(key)

  if (user.role === 'ADMIN') return true
  return Array.isArray(user.permissions) && user.permissions.includes(key)
}

/** The active preview, or null. Direct import: viewAsStore imports nothing
 *  from here, so there is no cycle to work around. */
function viewAsPermissions(): string[] | null {
  return useViewAsStore.getState().permissions
}

/** True if the user holds every one of `keys`. */
export function canAll(user: User | null, keys: PermissionKey[]): boolean {
  return keys.every((k) => can(user, k))
}

/** True if the user holds at least one of `keys`. */
export function canAny(user: User | null, keys: PermissionKey[]): boolean {
  return keys.some((k) => can(user, k))
}

/** Hook version for components. */
export function usePermission(key: PermissionKey): boolean {
  const user = useAuthStore((s) => s.user)
  return can(user, key)
}

/** All keys the signed-in user holds — for the access screens. */
export function usePermissionKeys(): PermissionKey[] {
  const user = useAuthStore((s) => s.user)
  return user?.permissions ?? []
}
