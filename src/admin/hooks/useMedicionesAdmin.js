import { useCallback, useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'

function clasificacion(score) {
  if (score <= 7)  return 'Mínima'
  if (score <= 15) return 'Leve'
  if (score <= 25) return 'Moderada'
  return 'Grave'
}

export function useMedicionesAdmin() {
  const [mediciones, setMediciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [alertas, setAlertas] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    const [{ data: bais, error: err }, { data: alertasData }] = await Promise.all([
      supabaseAdmin
        .from('resultados_bai')
        .select(`id, fecha, puntaje_total, respuestas, tipo_medicion, dias_desde_inicio, semana_estudio, ventana_esperada,
                 participante_id, participantes!participante_id(codigo_participante, grupo)`)
        .not('participante_id', 'is', null)
        .order('fecha', { ascending: false }),
      supabaseAdmin.rpc('obtener_alertas_bai'),
    ])
    if (err) setError(err.message)
    else setMediciones((bais ?? []).map(b => ({
      ...b,
      codigo_participante: b.participantes?.codigo_participante ?? '—',
      grupo: b.participantes?.grupo ?? null,
      clasificacion: clasificacion(b.puntaje_total),
    })))
    if (alertasData) setAlertas(alertasData)
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const resumen = {
    total: mediciones.length,
    basales: mediciones.filter(m => m.tipo_medicion === 'basal').length,
    estasSemana: mediciones.filter(m => {
      const diff = Date.now() - new Date(m.fecha).getTime()
      return diff < 7 * 86400000
    }).length,
    promedioExp: (() => {
      const exp = mediciones.filter(m => m.grupo === 'experimental')
      return exp.length ? Math.round(exp.reduce((s, m) => s + m.puntaje_total, 0) / exp.length * 10) / 10 : null
    })(),
    promedioCtr: (() => {
      const ctr = mediciones.filter(m => m.grupo === 'control')
      return ctr.length ? Math.round(ctr.reduce((s, m) => s + m.puntaje_total, 0) / ctr.length * 10) / 10 : null
    })(),
  }

  const TIPOS_ORDEN = ['basal', 'intermedia_4sem', 'final_8sem', 'seguimiento_12sem']
  const graficaData = TIPOS_ORDEN.map(tipo => {
    const deEste = mediciones.filter(m => m.tipo_medicion === tipo)
    const exp = deEste.filter(m => m.grupo === 'experimental')
    const ctr = deEste.filter(m => m.grupo === 'control')
    return {
      tipo,
      label: { basal: 'Basal', intermedia_4sem: '4 sem', final_8sem: '8 sem', seguimiento_12sem: '12 sem' }[tipo],
      experimental: exp.length ? exp.reduce((s, m) => s + m.puntaje_total, 0) / exp.length : null,
      control: ctr.length ? ctr.reduce((s, m) => s + m.puntaje_total, 0) / ctr.length : null,
    }
  })

  function exportarCSVWide() {
    const ITEMS_LABELS = [
      'Entumecimiento_hormigueo','Sensacion_calor','Temblor_piernas','Incapacidad_relajarse',
      'Miedo_algo_terrible','Mareo_aturdimiento','Palpitaciones','Inestabilidad','Terror',
      'Nerviosismo','Sensacion_ahogo','Temblor_manos','Inseguridad','Miedo_perder_control',
      'Dificultad_respirar','Miedo_morir','Asustado','Indigestion','Desmayo','Enrojecimiento','Sudoracion'
    ]
    const headers = [
      'codigo_participante','grupo','tipo_medicion','fecha','puntaje_total','clasificacion',
      'dias_desde_inicio','semana_estudio','ventana_esperada',
      ...ITEMS_LABELS.map((_, i) => `p${i + 1}`)
    ]
    const rows = mediciones.map(m => [
      m.codigo_participante,
      m.grupo ?? '',
      m.tipo_medicion ?? '',
      m.fecha ? new Date(m.fecha).toISOString().slice(0, 19).replace('T', ' ') : '',
      m.puntaje_total,
      m.clasificacion,
      m.dias_desde_inicio ?? '',
      m.semana_estudio ?? '',
      m.ventana_esperada ? '1' : '0',
      ...(Array.isArray(m.respuestas) ? m.respuestas : Array(21).fill('')),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `bai_wide_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return { mediciones, cargando, error, cargar, resumen, graficaData, alertas, exportarCSVWide, clasificacion }
}
