import { useParticipante } from '../context/ParticipanteContext'

export default function SoloGrupo({ grupos, fallback = null, children }) {
  const { grupoInterno, cargando } = useParticipante()
  if (cargando) return null
  return grupos.includes(grupoInterno) ? children : fallback
}
