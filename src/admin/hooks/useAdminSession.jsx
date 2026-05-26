import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'

const TIMEOUT_INACTIVIDAD_MS = 2 * 60 * 60 * 1000 // 2 horas

const AdminSessionContext = createContext(null)

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext)
  if (!ctx) throw new Error('useAdminSession debe usarse dentro de AdminSessionProvider')
  return ctx
}

export function AdminSessionProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Ref para acceso estable al estado admin dentro de callbacks y timers
  const adminRef = useRef(null)
  useEffect(() => { adminRef.current = admin }, [admin])

  const timerRef = useRef(null)

  // ─── Cerrar sesión ────────────────────────────────────────────────
  // useCallback con deps vacías: función estable (usa adminRef, no admin)
  const cerrarSesion = useCallback(async (motivo = 'logout_manual') => {
    const adminActual = adminRef.current
    if (adminActual && supabaseAdmin) {
      try {
        await supabaseAdmin.from('auditoria_admin').insert({
          admin_id: adminActual.id,
          accion: motivo === 'inactividad' ? 'logout_inactividad' : 'logout',
          entidad: 'sesion',
          detalles: { motivo },
        })
      } catch { /* no bloquear el logout si falla el audit */ }
    }
    clearTimeout(timerRef.current)
    await supabaseAdmin?.auth.signOut()
    setAdmin(null)
  }, [])

  // ─── Timer de inactividad ─────────────────────────────────────────
  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => cerrarSesion('inactividad'),
      TIMEOUT_INACTIVIDAD_MS
    )
  }, [cerrarSesion])

  // Adjuntar listeners de actividad solo cuando hay sesión admin activa
  useEffect(() => {
    if (!admin) return
    const eventos = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    eventos.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      eventos.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(timerRef.current)
    }
  }, [admin, resetTimer])

  // ─── Cargar datos del admin desde usuarios_admin ──────────────────
  async function cargarAdmin(uid) {
    if (!supabaseAdmin) return null
    const { data } = await supabaseAdmin
      .from('usuarios_admin')
      .select('*')
      .eq('id', uid)
      .eq('activo', true)
      .single()
    return data ?? null
  }

  // ─── Inicialización ───────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseAdmin) {
      setCargando(false)
      return
    }

    // INITIAL_SESSION se dispara desde localStorage (sin red) → rápido.
    // Si por alguna razón no llega en 6s, el fallback desbloquea la UI.
    const fallback = setTimeout(() => setCargando(false), 6_000)

    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setAdmin(null)
          setCargando(false)
          return
        }
        // setTimeout(0) rompe el deadlock: Supabase bloquea queries PostgREST
        // hechas sincrónicamente dentro del callback de onAuthStateChange
        const uid = session.user.id
        setTimeout(async () => {
          const adminData = await cargarAdmin(uid).catch(() => null)
          setAdmin(adminData)
          setCargando(false)
        }, 0)
      }
    )

    return () => {
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [])

  // ─── Iniciar sesión ───────────────────────────────────────────────
  async function iniciarSesion(email, password) {
    if (!supabaseAdmin) throw new Error('sin_cliente')

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Defer un tick para que el auth state machine libere el lock interno
    // antes de hacer queries PostgREST (evita deadlock en Supabase JS v2)
    await new Promise(resolve => setTimeout(resolve, 0))

    const adminData = await cargarAdmin(data.user.id)
    if (!adminData) {
      supabaseAdmin.auth.signOut().catch(() => {})
      throw new Error('no_admin')
    }

    // Fire-and-forget: no bloquean el login si fallan
    supabaseAdmin
      .from('usuarios_admin')
      .update({ ultima_sesion: new Date().toISOString() })
      .eq('id', data.user.id)
      .then(() => {}).catch(() => {})

    supabaseAdmin.from('auditoria_admin').insert({
      admin_id: data.user.id,
      accion: 'login',
      entidad: 'sesion',
      detalles: { email },
    }).then(() => {}).catch(() => {})

    setAdmin(adminData)
  }

  const valor = {
    admin,
    rol: admin?.rol ?? null,
    cargando,
    esInvestigador: admin?.rol === 'investigador',
    esTutora: admin?.rol === 'tutora',
    iniciarSesion,
    cerrarSesion,
  }

  return (
    <AdminSessionContext.Provider value={valor}>
      {children}
    </AdminSessionContext.Provider>
  )
}
