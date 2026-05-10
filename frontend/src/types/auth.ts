export interface AuthUser {
  userId: string
  email: string
  name: string
}

export interface AuthResponse {
  success: boolean
  data: {
    accessToken: string
    userId: string
    email: string
    name: string
  }
  error: string | null
}

export interface RegisterPayload {
  email: string
  name: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}
