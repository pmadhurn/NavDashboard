import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { useAuthStore, PermissionMap } from '@/shared/stores/authStore'

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

interface LoginRequest {
  email: string
  password: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export function useLogin() {
  const setAuth = useAuthStore(state => state.setAuth)

  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api.post<TokenResponse>('/auth/login', data),
    onSuccess: (data) => {
      setAuth(data.access_token, data.user)
    },
  })
}

interface GoogleAuthResponse {
  pending: boolean
  message?: string
  token?: TokenResponse
}

export function useGoogleLogin() {
  const setAuth = useAuthStore(state => state.setAuth)

  return useMutation({
    mutationFn: (credential: string) =>
      api.post<GoogleAuthResponse>('/auth/google', { credential }),
    onSuccess: (data) => {
      if (data.token) {
        setAuth(data.token.access_token, data.token.user)
      }
    },
  })
}

export interface ClerkAuthResponse {
  pending: boolean
  message?: string | null
  access_token?: string | null
  token_type?: string | null
}

/**
 * Trades a Clerk session JWT for this app's own token. A PENDING response is a
 * success, not an error: the account exists but an admin has not approved it.
 */
export function useClerkLogin() {
  const setAuth = useAuthStore(state => state.setAuth)

  return useMutation({
    mutationFn: (token: string) =>
      api.post<ClerkAuthResponse>('/auth/clerk', { token }),
    onSuccess: async (data) => {
      if (!data.pending && data.access_token) {
        localStorage.setItem('access_token', data.access_token)
        const me = await api.get<never>('/auth/me')
        setAuth(data.access_token, me)
      }
    },
  })
}

export function useLogout() {
  const logout = useAuthStore(state => state.logout)
  return () => {
    logout()
    window.location.href = '/login'
  }
}

export function useCurrentUser() {
  const token = useAuthStore(state => state.token)
  const setAuth = useAuthStore(state => state.setAuth)

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await api.get<User>('/auth/me')
      if (token) {
        setAuth(token, user)
      }
      return user
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })
}