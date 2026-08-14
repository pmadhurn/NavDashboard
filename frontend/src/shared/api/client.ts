import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/shared/stores/authStore'
import { isDemo, DEMO_READONLY_MESSAGE } from '@/shared/demo/demo'

const axiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

/** An axios-shaped rejection, so every existing error toast reads `detail`. */
function demoError(
  config: InternalAxiosRequestConfig,
  status: number,
  detail: string,
): AxiosError {
  return new AxiosError(detail, 'ERR_DEMO_BLOCKED', config, undefined, {
    data: { detail },
    status,
    statusText: status === 404 ? 'Not Found' : 'Forbidden',
    headers: {},
    config,
  } as AxiosResponse)
}

// ── Demo mode — registered FIRST, before anything auth-related ──────────────
// When the demo flag is set, every request gets its adapter swapped out, which
// stops axios from ever touching the network: GETs are answered from the
// fixture registry, writes are rejected with a read-only message (logout-ish
// calls resolve harmlessly so signing out of the demo never errors).
axiosInstance.interceptors.request.use((config) => {
  if (!isDemo()) return config

  const method = (config.method ?? 'get').toLowerCase()
  const url = config.url ?? ''
  const respond = (data: unknown): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  if (method === 'get' || method === 'head') {
    config.adapter = async () => {
      // Loaded on demand so real users never download the fixture data.
      const { resolveDemo, DemoHttpError } = await import('@/shared/demo/fixtures')
      try {
        return respond(resolveDemo(config))
      } catch (e) {
        if (e instanceof DemoHttpError) throw demoError(config, e.status, e.detail)
        throw e
      }
    }
  } else if (url.includes('/auth/logout') || url.includes('/logout')) {
    config.adapter = async () => respond({})
  } else {
    config.adapter = async () => {
      throw demoError(config, 403, DEMO_READONLY_MESSAGE)
    }
  }
  return config
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A 401 from the sign-in endpoints means "those credentials were rejected", not
// "your session expired" — redirecting there would reload the page and discard
// the error before the login form could show it.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/google']

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? ''
    const isAuthAttempt = AUTH_ENDPOINTS.some((path) => url.startsWith(path))

    if (error.response?.status === 401 && !isAuthAttempt) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export const api = {
  get: <T>(url: string, params?: object): Promise<T> =>
    axiosInstance.get(url, { params }).then(res => res.data),
  post: <T>(url: string, data?: object): Promise<T> =>
    axiosInstance.post(url, data).then(res => res.data),
  put: <T>(url: string, data?: object): Promise<T> =>
    axiosInstance.put(url, data).then(res => res.data),
  del: <T>(url: string): Promise<T> =>
    axiosInstance.delete(url).then(res => res.data),
  upload: <T>(url: string, formData: FormData): Promise<T> =>
    axiosInstance
      .post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(res => res.data),
  /** GET a file and trigger a browser download with the given filename. */
  downloadFile: async (url: string, filename: string): Promise<void> => {
    const res = await axiosInstance.get(url, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  },
}