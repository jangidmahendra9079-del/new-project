/**
 * CivicLoop — Axios API client with JWT injection + token refresh
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30_000,
})

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor — refresh on 401 ────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        useAuthStore.getState().clearAuth()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        })
        useAuthStore.getState().setAuth(data)
        processQueue(null, data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        useAuthStore.getState().clearAuth()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    // User-friendly error messages
    if (error.response?.status === 429) {
      toast.error('Too many requests. Please slow down.')
    } else if (error.response?.status === 403) {
      toast.error('Access denied.')
    } else if (error.response?.status && error.response.status >= 500) {
      toast.error('Server error. Please try again later.')
    }

    return Promise.reject(error)
  }
)

export default api
