import { Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="app-layout">
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
