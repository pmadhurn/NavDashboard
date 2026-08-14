/**
 * Demo mode — a self-contained, read-only tour of the app with sample data.
 *
 * The flag lives in sessionStorage so closing the tab ends the demo, and the
 * axios interceptor in shared/api/client.ts answers every request from the
 * fixture registry — in demo mode nothing ever reaches the backend.
 */

const DEMO_FLAG = 'navdash_demo'
const TOKEN_KEY = 'access_token'
const USER_KEY = 'auth_user'

/** Height of the fixed "Demo mode" banner the shell renders above the top nav. */
export const DEMO_BANNER_HEIGHT = 30

/** The message every blocked write surfaces through the existing error toasts. */
export const DEMO_READONLY_MESSAGE =
  'This is a read-only demo — sign in to the real thing to make changes'

export function isDemo(): boolean {
  try {
    return sessionStorage.getItem(DEMO_FLAG) === '1'
  } catch {
    return false
  }
}

/**
 * The signed-in identity for the demo. ADMIN on purpose: the frontend `can()`
 * short-circuits ADMIN to allow-all, so the entire nav renders without a
 * permission fixture per key.
 */
export const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@navdashboard.com',
  username: 'demo',
  full_name: 'Demo Visitor',
  role: 'ADMIN',
  is_active: true,
  auth_provider: 'demo',
  status: 'ACTIVE',
  permissions: [] as string[],
}

/** Seed auth storage exactly the way authStore hydrates it, then reload into the app. */
export function enterDemo(): void {
  sessionStorage.setItem(DEMO_FLAG, '1')
  localStorage.setItem(TOKEN_KEY, 'demo')
  localStorage.setItem(USER_KEY, JSON.stringify(DEMO_USER))
  // Hard navigation: the auth store hydrates synchronously at module load, so a
  // full reload is the one way to guarantee every store starts from demo state.
  window.location.href = '/'
}

export function exitDemo(): void {
  sessionStorage.removeItem(DEMO_FLAG)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.location.href = '/login'
}
