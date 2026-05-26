import { useAdminSession } from '../hooks/useAdminSession'

export default function RequiereRol({ roles, children }) {
  const { rol } = useAdminSession()
  if (roles.includes(rol)) return children

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Solo lectura — contacta al investigador principal para realizar modificaciones.
    </div>
  )
}
