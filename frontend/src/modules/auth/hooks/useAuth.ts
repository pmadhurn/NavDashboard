import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { useAuthStore } from '@/shared/stores/authStore'

interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
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