import { Navigate, Outlet } from 'react-router-dom'
import { useAdminSession } from '../hooks/useAdminSession'

function Cargando() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Verificando acceso…</p>
      </div>
    </div>
  )
}

// Layout route: si no hay sesión admin válida redirige a /admin/login
export default function RequiereAdmin() {
  const { admin, cargando } = useAdminSession()
  if (cargando) return <Cargando />
  if (!admin) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
