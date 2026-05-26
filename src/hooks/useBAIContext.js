import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useParticipante } from '../context/ParticipanteContext'

const TIPO_LABEL = {
  basal: 'Basal',
  intermedia_4sem: 'Intermedia (4 semanas)',
  final_8sem: 'Final (8 semanas)',
  seguimiento_12sem: 'Seguimiento (12 semanas)',
  voluntaria: 'Voluntaria',
}

function severidad(score) {
  if (score <= 7)  return { label: 'Mínima',   color: '#22c55e', bgColor: 'bg-green-100',  textColor: 'text-green-700'  }
  if (score <= 15) return { label: 'Leve',      color: '#eab308', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' }
  if (score <= 25) return { label: 'Moderada',  color: '#f97316', bgColor: 'bg-orange-100', textColor: 'text-orange-700' }
  return           { label: 'Grave',            color: '#ef4444', bgColor: 'bg-red-100',    textColor: 'text-red-700'    }
}

export function useBAIContext() {
  const { userId } = useAuth()
  const { fechaInicio } = useParticipante()
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!supabase || !userId) { setCargando(false); return }
    const { data } = await supabase
      .from('resultados_bai')
      .select('id, fecha, puntaje_total, tipo_medicion, dias_desde_inicio, ventana_esperada')
      .eq('user_id', userId)
      .order('fecha', { ascending: true })
    setHistorial(data ?? [])
    setCargando(false)
  }, [userId])

  useEffect(() => { cargar() }, [cargar])

  const diasDesdeInicio = fechaInicio
    ? Math.max(0, Math.floor((Date.now() - new Date(fechaInicio).getTime()) / 86400000))
    : null

  const porTipo = (tipo) => historial.find(h => h.tipo_medicion === tipo) ?? null
  const tieneBasal        = !!porTipo('basal')
  const tieneIntermedia   = !!porTipo('intermedia_4sem')
  const tieneFinal        = !!porTipo('final_8sem')
  const tieneSeguimiento  = !!porTipo('seguimiento_12sem')

  const enVentana = {
    basal:        diasDesdeInicio !== null && diasDesdeInicio <= 2,
    intermedia:   diasDesdeInicio !== null && diasDesdeInicio >= 25 && diasDesdeInicio <= 35,
    final:        diasDesdeInicio !== null && diasDesdeInicio >= 53 && diasDesdeInicio <= 63,
    seguimiento:  diasDesdeInicio !== null && diasDesdeInicio >= 81 && diasDesdeInicio <= 91,
  }

  function getBannerContext() {
    if (!fechaInicio) return { tipo: 'voluntaria', color: 'neutro', texto: 'Esta será una medición voluntaria. Puedes completarla cuando quieras.' }

    if (!tieneBasal) {
      if (diasDesdeInicio <= 2) return { tipo: 'basal', color: 'verde', texto: 'Este es tu BAI inicial. Mide tu nivel de ansiedad al comenzar el estudio. Toma unos 10 minutos.' }
      return { tipo: 'basal', color: 'ambar', urgente: true, texto: 'El BAI inicial está pendiente. Es importante completarlo para que tus datos sean analizables. Por favor hazlo hoy.' }
    }
    if (enVentana.intermedia) {
      if (!tieneIntermedia) return { tipo: 'intermedia_4sem', color: 'azul', texto: 'Es momento de tu BAI de seguimiento de 4 semanas. Ayuda mucho a la investigación que lo completes esta semana.' }
      return { tipo: 'voluntaria', color: 'info', texto: 'Ya completaste tu BAI de 4 semanas. Puedes hacer mediciones adicionales si quieres, se registrarán como voluntarias.' }
    }
    if (enVentana.final) {
      if (!tieneFinal) return { tipo: 'final_8sem', color: 'azul', texto: 'Es momento de tu BAI de seguimiento de 8 semanas. Ayuda mucho a la investigación que lo completes esta semana.' }
      return { tipo: 'voluntaria', color: 'info', texto: 'Ya completaste tu BAI de 8 semanas. Puedes hacer mediciones adicionales si quieres, se registrarán como voluntarias.' }
    }
    if (enVentana.seguimiento) {
      if (!tieneSeguimiento) return { tipo: 'seguimiento_12sem', color: 'azul', texto: 'Es momento de tu BAI de seguimiento de 12 semanas. Ayuda mucho a la investigación que lo completes esta semana.' }
      return { tipo: 'voluntaria', color: 'info', texto: 'Ya completaste tu BAI de 12 semanas. Puedes hacer mediciones adicionales si quieres, se registrarán como voluntarias.' }
    }
    return { tipo: 'voluntaria', color: 'neutro', texto: 'Esta será una medición voluntaria. Puedes completarla cuando quieras.' }
  }

  function getProximaMedicion() {
    if (!fechaInicio || !tieneBasal) return null
    const inicio = new Date(fechaInicio).getTime()
    if (!tieneIntermedia) return { tipo: 'intermedia_4sem', label: '4 semanas', desde: new Date(inicio + 25 * 86400000), hasta: new Date(inicio + 35 * 86400000) }
    if (!tieneFinal)      return { tipo: 'final_8sem',      label: '8 semanas', desde: new Date(inicio + 53 * 86400000), hasta: new Date(inicio + 63 * 86400000) }
    if (!tieneSeguimiento) return { tipo: 'seguimiento_12sem', label: '12 semanas', desde: new Date(inicio + 81 * 86400000), hasta: new Date(inicio + 91 * 86400000) }
    return null
  }

  const HITOS = [
    { tipo: 'basal',            label: 'Basal',     diasDesde: 0,  diasHasta: 2  },
    { tipo: 'intermedia_4sem',  label: '4 sem',     diasDesde: 25, diasHasta: 35 },
    { tipo: 'final_8sem',       label: '8 sem',     diasDesde: 53, diasHasta: 63 },
    { tipo: 'seguimiento_12sem',label: '12 sem',    diasDesde: 81, diasHasta: 91 },
  ]

  const hitosConDatos = HITOS.map(h => {
    const bai = porTipo(h.tipo)
    const inicio = fechaInicio ? new Date(fechaInicio).getTime() : null
    const fechaDesde = inicio ? new Date(inicio + h.diasDesde * 86400000) : null
    const fechaHasta = inicio ? new Date(inicio + h.diasHasta * 86400000) : null
    return {
      ...h,
      hecho: !!bai,
      puntaje: bai?.puntaje_total ?? null,
      fecha: bai?.fecha ?? null,
      severidad: bai ? severidad(bai.puntaje_total) : null,
      fechaDesde,
      fechaHasta,
    }
  })

  const voluntarias = historial.filter(h => h.tipo_medicion === 'voluntaria')

  return {
    historial, cargando, cargar,
    diasDesdeInicio, tieneBasal, tieneIntermedia, tieneFinal, tieneSeguimiento,
    enVentana, bannerContext: getBannerContext(), proximaMedicion: getProximaMedicion(),
    hitosConDatos, voluntarias,
    TIPO_LABEL, severidad,
    porTipo,
  }
}
