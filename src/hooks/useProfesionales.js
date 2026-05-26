import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useProfesionales() {
  const [profesionales, setProfesionales] = useState([])
  const [cargando, setCargando]           = useState(true)

  useEffect(() => {
    if (!supabase) { setCargando(false); return }

    supabase
      .from('profesionales_apoyo_publico')
      .select('*')
      .then(({ data }) => setProfesionales(data ?? []))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  return { profesionales, cargando }
}
