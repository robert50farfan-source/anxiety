import { NavLink, Outlet } from 'react-router-dom'
import { useAdminSession } from '../../hooks/useAdminSession'

export default function Configuracion() {
  const { esInvestigador } = useAdminSession()

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión del panel y del estudio</p>
      </div>

      {/* Sub-navegación */}
      <div className="flex gap-1 border-b border-slate-200">
        <NavLink
          to="administradores"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`
          }
        >
          Administradores
        </NavLink>

        {esInvestigador && (
          <NavLink
            to="auditoria"
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`
            }
          >
            Auditoría
          </NavLink>
        )}
      </div>

      <Outlet />
    </div>
  )
}
