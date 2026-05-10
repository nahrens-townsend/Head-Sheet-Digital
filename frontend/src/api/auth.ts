import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth'
import { apiClient } from './client'

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload).then((r) => r.data),

  refresh: () =>
    apiClient.post<AuthResponse>('/auth/refresh').then((r) => r.data),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<AuthResponse>('/auth/me').then((r) => r.data),
}
