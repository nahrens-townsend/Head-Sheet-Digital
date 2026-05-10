import { create } from 'zustand'
import type { AuthUser } from '../types/auth'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isInitializing: boolean
  setAuth: (user: AuthUser, token: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  setAccessToken: (accessToken) =>
    set((state) => ({
      accessToken,
      isAuthenticated: !!state.user,
    })),

  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),

  setInitialized: () =>
    set({ isInitializing: false }),
}))
