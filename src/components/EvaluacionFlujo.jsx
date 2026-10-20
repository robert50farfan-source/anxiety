import { useState } from 'react'
import BAI from '../pages/BAI'
import CuestionarioLikert from './CuestionarioLikert'
import { SWLS, SUS } from '../config/escalas'

// ─── Flujo de evaluación ──────────────────────────────────────────────────────
// Presenta varios cuestionarios seguidos como una sola evaluación
// (p. ej. basal: BAI → SWLS; semana 8: BAI → SWLS → SUS).
// `pasos`: ids en orden ('bai' | 'swls' | 'sus'). `onTerminar` se llama al acabar o al cerrar.

const ESCALAS = { swls: SWLS, sus: SUS }

export default function EvaluacionFlujo({ pasos, onTerminar }) {
  const [idx, setIdx] = useState(0)
  const actual = pasos[idx]
  if (!actual) return null

  const restantes = pasos.length - idx - 1
  const continuar = restantes > 0 ? () => setIdx(i => i + 1) : onTerminar
  const continuarLabel = restantes > 0
    ? `Continuar (${restantes} cuestionario${restantes > 1 ? 's' : ''} más)`
    : 'Terminar'
  const paso = pasos.length > 1 ? `Cuestionario ${idx + 1} de ${pasos.length}` : null

  if (actual === 'bai') {
    return <BAI key="bai" onClose={onTerminar} onContinuar={continuar} continuarLabel={continuarLabel} />
  }

  return (
    <CuestionarioLikert
      key={actual}
      escala={ESCALAS[actual]}
      paso={paso}
      onClose={onTerminar}
      onContinuar={continuar}
      continuarLabel={continuarLabel}
    />
  )
}
