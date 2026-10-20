// ─── Calendario de evaluaciones del estudio ───────────────────────────────────
// Mismas ventanas (días desde fecha_inicio_estudio) que los triggers
// tipificar_bai_automatica / tipificar_swls_automatica.
// Lógica pura, sin React ni Supabase, para poder probarla aislada.

export const VENTANAS = {
  basal:             { desde: 0,  hasta: 2  },
  intermedia_4sem:   { desde: 25, hasta: 35 },
  final_8sem:        { desde: 53, hasta: 63 },
  seguimiento_12sem: { desde: 81, hasta: 91 },
}

// Instrumentos que se aplican en cada ventana, en el orden del flujo
export const INSTRUMENTOS_POR_VENTANA = {
  basal:             ['bai', 'swls'],
  intermedia_4sem:   ['bai'],
  final_8sem:        ['bai', 'swls'],
  seguimiento_12sem: ['bai', 'swls'],
}

// Ventanas de seguimiento que se presentan como un flujo de evaluación conjunto
export const VENTANAS_FLUJO = ['final_8sem', 'seguimiento_12sem']

// Hasta este día la SWLS basal bloquea el acceso; después solo se recuerda
export const DIA_LIMITE_SWLS_BLOQUEANTE = 3

const DIA_MS = 86_400_000

export function diasDesdeInicio(fechaInicio, ahora = Date.now()) {
  if (!fechaInicio) return null
  return Math.max(0, Math.floor((ahora - new Date(fechaInicio).getTime()) / DIA_MS))
}

export function ventanaDeSeguimiento(dias) {
  if (dias === null || dias === undefined) return null
  for (const tipo of ['intermedia_4sem', 'final_8sem', 'seguimiento_12sem']) {
    const v = VENTANAS[tipo]
    if (dias >= v.desde && dias <= v.hasta) return tipo
  }
  return null
}

const ESTADOS_ACTIVOS = ['activo', 'consentimiento_firmado']

// Evaluación inicial: BAI + SWLS bloquean el acceso desde que se firma el
// consentimiento. Cuentas que ya pasaron el día límite sin SWLS basal no se
// bloquean: se les recuerda sin impedir el uso.
//   totalBAI: cantidad de BAI del participante (cualquier tipo)
//   tieneSWLSBasal: si ya existe una SWLS tipificada como basal
export function calcularEvaluacionInicial({ estado, fechaInicio, totalBAI, tieneSWLSBasal, ahora = Date.now() }) {
  const sinPendientes = { bloquea: false, pendientes: [], swlsTardia: false }
  if (!ESTADOS_ACTIVOS.includes(estado) || !fechaInicio) return sinPendientes

  const dias = diasDesdeInicio(fechaInicio, ahora)
  const faltaBAI  = (totalBAI ?? 0) === 0
  const faltaSWLS = !tieneSWLSBasal

  if (faltaBAI) {
    return { bloquea: true, pendientes: faltaSWLS ? ['bai', 'swls'] : ['bai'], swlsTardia: false }
  }
  if (faltaSWLS) {
    return dias <= DIA_LIMITE_SWLS_BLOQUEANTE
      ? { bloquea: true,  pendientes: ['swls'], swlsTardia: false }
      : { bloquea: false, pendientes: [],       swlsTardia: true  }
  }
  return sinPendientes
}

// Evaluación de seguimiento (semanas 8 y 12): instrumentos que faltan en la
// ventana actual.
//   hechos: { bai: Set<tipo_medicion>, swls: Set<tipo_medicion>, ... }
export function calcularSeguimiento({ fechaInicio, hechos, ahora = Date.now() }) {
  const dias    = diasDesdeInicio(fechaInicio, ahora)
  const ventana = ventanaDeSeguimiento(dias)
  if (!ventana || !VENTANAS_FLUJO.includes(ventana)) return { ventana, pendientes: [] }

  const pendientes = INSTRUMENTOS_POR_VENTANA[ventana]
    .filter(inst => !hechos?.[inst]?.has(ventana))
  return { ventana, pendientes }
}
