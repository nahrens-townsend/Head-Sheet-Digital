import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { authApi } from './api/auth'
import { useAuthStore } from './stores/authStore'

const queryClient = new QueryClient()

// Module-level singleton: survives React StrictMode double-invoke.
// Runs immediately on first import — before any render.
let authInitPromise: Promise<void> | null = null

function ensureAuthInit(): Promise<void> {
  if (!authInitPromise) {
    const { setAuth, setInitialized } = useAuthStore.getState()
    authInitPromise = authApi
      .refresh()
      .then((res) => {
        if (res.data) {
          setAuth(
            { userId: res.data.userId, email: res.data.email, name: res.data.name },
            res.data.accessToken,
          )
        }
      })
      .catch(() => {
        // No valid refresh cookie — user is unauthenticated. That's fine.
      })
      .finally(() => {
        setInitialized()
      })
  }
  return authInitPromise
}

function AuthInitializer() {
  useEffect(() => {
    ensureAuthInit()
  }, [])

  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
