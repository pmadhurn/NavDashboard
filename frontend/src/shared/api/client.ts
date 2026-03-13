import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
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
}