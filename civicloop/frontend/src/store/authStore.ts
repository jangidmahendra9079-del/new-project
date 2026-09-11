/**
 * CivicLoop — Auth Store (Zustand)
 * Persists tokens in localStorage (no sensitive data in state).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'citizen' | 'field_officer' | 'department_officer' | 'super_admin' | 'public'

interface AuthResponseData {
  access_token: string
  refresh_token?: string
  role?: string
  user_id?: string
  name?: string
  user?: {
    id?: string
    name?: string
    role?: string
    email?: string
  }
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  role: UserRole | null
  userId: string | null
  name: string | null
  isAuthenticated: boolean
  setAuth: (data: AuthResponseData) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      role: null,
      userId: null,
      name: null,
      isAuthenticated: false,

      setAuth: (data: AuthResponseData) => {
        const u = data.user || {}
        const role = (data.role || u.role || 'citizen') as UserRole
        const userId = data.user_id || u.id || null
        const name = data.name || u.name || null
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || null,
          role,
          userId,
          name,
          isAuthenticated: true,
        })
      },

      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          role: null,
          userId: null,
          name: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'civicloop-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        role: state.role,
        userId: state.userId,
        name: state.name,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
