import { supabaseAdmin } from './supabaseAdmin'
import { traerTodo } from './traerTodo'
import { ESCALAS_ADMIN, interpretarBAI } from './escalasAdmin'

// ─── Exportación de mediciones en formato largo ───────────────────────────────
// Una fila por participante × instrumento × medición (tipo_medicion + fecha),
// con ítems item_1…item_21 (vacíos cuando el instrumento tiene menos ítems).

const MAX_ITEMS = 21 // BAI
const GRUPO = { experimental: 'EXP', control: 'CTR' }
const JOIN  = 'participantes!participante_id(codigo_participante, grupo)'

function base(m, instrumento, puntaje, interpretacion) {
  return {
    codigo_participante: m.participantes?.codigo_participante ?? '',
    grupo:               GRUPO[m.participantes?.grupo] ?? '',
    instrumento,
    tipo_medicion:       m.tipo_medicion ?? '',
    fecha:               m.fecha ? new Date(m.fecha).toISOString() : '',
    dias_desde_inicio:   m.dias_desde_inicio ?? null,
    ventana_esperada:    !!m.ventana_esperada,
    puntaje_total:       puntaje ?? null,
    interpretacion:      interpretacion ?? '',
  }
}

async function filasBAI() {
  const bais = await traerTodo(() => supabaseAdmin
    .from('resultados_bai')
    .select(`fecha, puntaje_total, respuestas, tipo_medicion, dias_desde_inicio, ventana_esperada, ${JOIN}`)
    .not('participante_id', 'is', null))
  return bais.map(m => {
    const items = Array.isArray(m.respuestas) ? m.respuestas : []
    return { ...base(m, 'BAI', m.puntaje_total, interpretarBAI(m.puntaje_total)), items }
  })
}

async function filasEscala(escala) {
  const filas = await traerTodo(() => supabaseAdmin
    .from(escala.tabla)
    .select(`*, ${JOIN}`)
    .not('participante_id', 'is', null))
  return filas.map(m => {
    const items = Array.from({ length: escala.nItems }, (_, i) => m[`item_${i + 1}`])
    return { ...base(m, escala.nombre, Number(m.puntaje_total), escala.interpretar(m.puntaje_total)), items }
  })
}

export async function obtenerMedicionesLargo() {
  const grupos = await Promise.all([filasBAI(), ...Object.values(ESCALAS_ADMIN).map(filasEscala)])
  return grupos.flat().sort((a, b) =>
    a.codigo_participante.localeCompare(b.codigo_participante) ||
    a.instrumento.localeCompare(b.instrumento) ||
    a.fecha.localeCompare(b.fecha))
}

const csvCampo = (v) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function descargar(contenido, tipo, nombre) {
  const blob = new Blob([contenido], { type: tipo })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = nombre
  a.click(); URL.revokeObjectURL(url)
}

export function descargarCSVLargo(filas) {
  const itemCols = Array.from({ length: MAX_ITEMS }, (_, i) => `item_${i + 1}`)
  const headers = ['codigo_participante', 'grupo', 'instrumento', 'tipo_medicion', 'fecha',
    'dias_desde_inicio', 'ventana_esperada', 'puntaje_total', 'interpretacion', ...itemCols]
  const rows = filas.map(f => [
    f.codigo_participante, f.grupo, f.instrumento, f.tipo_medicion, f.fecha,
    f.dias_desde_inicio, f.ventana_esperada ? 1 : 0, f.puntaje_total, f.interpretacion,
    ...itemCols.map((_, i) => f.items[i]),
  ].map(csvCampo).join(','))
  // BOM para que Excel/SPSS lean bien las tildes
  descargar('﻿' + [headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8;',
    `mediciones_largo_${new Date().toISOString().slice(0, 10)}.csv`)
}

export function descargarJSONLargo(filas) {
  descargar(JSON.stringify(filas, null, 2), 'application/json',
    `mediciones_largo_${new Date().toISOString().slice(0, 10)}.json`)
}
