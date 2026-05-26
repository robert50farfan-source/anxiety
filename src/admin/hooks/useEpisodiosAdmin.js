import { useState, useEffect, useCallback } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { ESTRATEGIA_LABEL } from '../../hooks/useEpisodios'

let tTestTwoSampleFn = null
import('simple-statistics').then(m => {
  tTestTwoSampleFn = m.tTestTwoSample ?? null
}).catch(() => {})

export function useEpisodiosAdmin() {
  const [episodios, setEpisodios] = useState([])
  const [alertas, setAlertas] = useState(null)
  const [cargando, setCargando] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!supabaseAdmin) return
    const [{ data: eps }, { data: alts }] = await Promise.all([
      supabaseAdmin
        .from('episodios_ansiedad')
        .select('*, participantes(codigo_participante, grupo)')
        .order('fecha_inicio', { ascending: false }),
      supabaseAdmin.rpc('obtener_alertas_episodios'),
    ])
    setEpisodios(eps ?? [])
    setAlertas(alts)
    setCargando(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Resumen cards
  const resumen = (() => {
    const ahora = new Date()
    const hace7 = new Date(ahora - 7 * 86400000)
    const completados = episodios.filter(e => e.completado)
    const estaSemana = completados.filter(e => new Date(e.fecha_inicio) >= hace7)
    const graves = estaSemana.filter(e => e.intensidad === 'severa')
    const exp = completados.filter(e => e.participantes?.grupo === 'experimental')
    const ctr = completados.filter(e => e.participantes?.grupo === 'control')
    return {
      total: completados.length,
      estaSemana: estaSemana.length,
      graves: graves.length,
      totalExp: exp.length,
      totalCtr: ctr.length,
    }
  })()

  // Datos gráfica comparativa (líneas por semana, 8 semanas)
  const graficaComparativa = (() => {
    const ahora = new Date()
    return Array.from({ length: 8 }, (_, i) => {
      const ini = new Date(ahora - (8 - i) * 7 * 86400000)
      const fin = new Date(ahora - (7 - i) * 7 * 86400000)
      const enVentana = (e) => {
        const f = new Date(e.fecha_inicio); return f >= ini && f < fin && e.completado
      }
      const exp = episodios.filter(e => e.participantes?.grupo === 'experimental' && enVentana(e))
      const ctr = episodios.filter(e => e.participantes?.grupo === 'control' && enVentana(e))
      const nExp = new Set(episodios.filter(e => e.participantes?.grupo === 'experimental').map(e => e.participante_id)).size || 1
      const nCtr = new Set(episodios.filter(e => e.participantes?.grupo === 'control').map(e => e.participante_id)).size || 1
      return {
        semana: `S${i + 1}`,
        experimental: exp.length / nExp,
        control: ctr.length / nCtr,
      }
    })
  })()

  // Welch's degrees of freedom
  function welchDF(a, b) {
    const varA = variance(a), varB = variance(b)
    const nA = a.length, nB = b.length
    const num = Math.pow(varA / nA + varB / nB, 2)
    const den = Math.pow(varA / nA, 2) / (nA - 1) + Math.pow(varB / nB, 2) / (nB - 1)
    return num / den
  }

  function variance(arr) {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length
    return arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (arr.length - 1)
  }

  function lgamma(z) {
    const c = [76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5]
    let x = z, y = z, tmp = x + 5.5
    tmp -= (x + 0.5) * Math.log(tmp)
    let ser = 1.000000000190015
    for (let j = 0; j < 6; j++) ser += c[j] / ++y
    return -tmp + Math.log(2.5066282746310005 * ser / x)
  }

  function ibeta(a, b, x) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b)
    const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a
    let f = 1, C = 1, D = 1 - (a + b) * x / (a + 1)
    if (Math.abs(D) < 1e-30) D = 1e-30
    D = 1 / D; f = D
    for (let m = 1; m <= 100; m++) {
      const m2 = 2 * m
      let d = m * (b - m) * x / ((a + m2 - 1) * (a + m2))
      D = 1 + d * D; if (Math.abs(D) < 1e-30) D = 1e-30; D = 1 / D
      C = 1 + d / C; if (Math.abs(C) < 1e-30) C = 1e-30
      f *= C * D
      d = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1))
      D = 1 + d * D; if (Math.abs(D) < 1e-30) D = 1e-30; D = 1 / D
      C = 1 + d / C; if (Math.abs(C) < 1e-30) C = 1e-30
      const delta = C * D; f *= delta
      if (Math.abs(delta - 1) < 1e-10) break
    }
    return front * f
  }

  function welchPValue(t, df) {
    const x = df / (df + t * t)
    const beta = ibeta(df / 2, 0.5, x)
    return Math.min(1, Math.max(0, beta))
  }

  // t-test comparativo (intensidad, frecuencia, duración)
  const calcularTTest = (campo) => {
    const exp = episodios.filter(e => e.participantes?.grupo === 'experimental' && e.completado && e[campo] != null).map(e => e[campo])
    const ctr = episodios.filter(e => e.participantes?.grupo === 'control' && e.completado && e[campo] != null).map(e => e[campo])
    if (exp.length < 2 || ctr.length < 2) return null
    try {
      const fn = tTestTwoSampleFn
      if (!fn) return null
      const t = fn(exp, ctr)
      const df = welchDF(exp, ctr)
      const p = welchPValue(Math.abs(t), df)
      const avgExp = exp.reduce((s, v) => s + v, 0) / exp.length
      const avgCtr = ctr.reduce((s, v) => s + v, 0) / ctr.length
      return { t: t.toFixed(3), p: p.toFixed(4), avgExp: avgExp.toFixed(2), avgCtr: avgCtr.toFixed(2), nExp: exp.length, nCtr: ctr.length }
    } catch { return null }
  }

  // Promedio efectividad por estrategia (solo experimental)
  const efectividadPorEstrategia = (() => {
    const map = {}
    episodios.filter(e => e.participantes?.grupo === 'experimental' && e.completado && e.efectividad_estrategia).forEach(e => {
      ;(e.estrategias_aplicadas ?? []).forEach(s => {
        if (!map[s]) map[s] = { suma: 0, n: 0 }
        map[s].suma += e.efectividad_estrategia
        map[s].n++
      })
    })
    return Object.entries(map)
      .map(([k, { suma, n }]) => ({ estrategia: ESTRATEGIA_LABEL[k] ?? k, promedio: (suma / n).toFixed(1), n }))
      .sort((a, b) => b.promedio - a.promedio)
  })()

  // Exportar CSV wide (BOM para SPSS)
  const exportarCSV = () => {
    const SINT_FISICOS = ['palpitaciones','sudoración','mareo','falta_de_aire','temblor','náusea','tensión_muscular','dolor_de_pecho','hormigueo']
    const SINT_EMOCIONALES = ['preocupación_intensa','miedo','irritabilidad','sensación_de_irrealidad','miedo_a_perder_control','miedo_a_morir']
    const ESTRATEGIAS = ['respiracion_478','grounding_54321','relajacion_muscular','mindfulness','visualizacion_guiada','chat_ia','respiro_solo','distraccion','hable_alguien','espere','busque_informacion','contacto_profesional','contacto_personal','otra','nada']

    const headers = [
      'codigo','grupo','fecha_inicio','tipo_evento','intensidad','intensidad_numerica',
      'duracion_minutos','en_curso','contexto','desencadenante','efectividad_estrategia',
      'completado','fecha_completado','notas',
      ...SINT_FISICOS.map(s => `sf_${s}`),
      ...SINT_EMOCIONALES.map(s => `se_${s}`),
      ...ESTRATEGIAS.map(s => `est_${s}`),
    ]

    const rows = episodios.map(e => {
      const p = e.participantes ?? {}
      const sf = SINT_FISICOS.map(s => (e.sintomas_fisicos ?? []).includes(s) ? 1 : 0)
      const se = SINT_EMOCIONALES.map(s => (e.sintomas_emocionales ?? []).includes(s) ? 1 : 0)
      const est = ESTRATEGIAS.map(s => (e.estrategias_aplicadas ?? []).includes(s) ? 1 : 0)
      return [
        p.codigo_participante ?? '', p.grupo ?? '',
        e.fecha_inicio ? new Date(e.fecha_inicio).toLocaleString('es-PE') : '',
        e.tipo_evento ?? '', e.intensidad ?? '', e.intensidad_numerica ?? '',
        e.duracion_minutos ?? '', e.en_curso ? 1 : 0,
        e.contexto ?? '', e.desencadenante ?? '', e.efectividad_estrategia ?? '',
        e.completado ? 1 : 0,
        e.fecha_completado ? new Date(e.fecha_completado).toLocaleString('es-PE') : '',
        `"${(e.notas ?? '').replace(/"/g, '""')}"`,
        ...sf, ...se, ...est,
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `episodios_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return { episodios, alertas, resumen, graficaComparativa, calcularTTest, efectividadPorEstrategia, exportarCSV, cargando, recargar: fetchAll }
}
