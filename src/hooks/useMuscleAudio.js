import { useState, useRef, useCallback, useEffect } from 'react'

const TONES = {
  tense: { freq: 440, dur: 0.5 },   // A4 — alerta, activación
  relax: { freq: 285, dur: 1.0 },   // D4 — suave, liberación
}

export function useMuscleAudio() {
  const [muted, setMuted] = useState(false)
  const ctxRef   = useRef(null)
  const synthRef = useRef(typeof speechSynthesis !== 'undefined' ? speechSynthesis : null)

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }

  const playTone = useCallback((stage) => {
    if (muted) return
    const cfg = TONES[stage]
    if (!cfg) return
    try {
      const ctx  = getCtx()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.dur)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + cfg.dur)
    } catch { /* ignore */ }
  }, [muted])

  const speak = useCallback((text) => {
    if (muted || !synthRef.current) return
    synthRef.current.cancel()
    const utter  = new SpeechSynthesisUtterance(text)
    utter.lang   = 'es-ES'
    utter.rate   = 0.82
    utter.pitch  = 1.0
    utter.volume = 1.0
    const voices = synthRef.current.getVoices()
    const esVoice = voices.find(v => v.lang.startsWith('es'))
    if (esVoice) utter.voice = esVoice
    synthRef.current.speak(utter)
  }, [muted])

  // stage: 'tense' | 'relax'
  // groupName: e.g. 'Pies y dedos'
  // instruction: full instruction text
  const cue = useCallback((stage, groupName, instruction) => {
    playTone(stage)
    const prefix = stage === 'tense'
      ? `${groupName}. Tensa.`
      : 'Relaja.'
    setTimeout(() => speak(`${prefix} ${instruction}`), 350)
  }, [playTone, speak])

  const cancel = useCallback(() => {
    synthRef.current?.cancel()
  }, [])

  const toggleMute = () => {
    if (!muted) synthRef.current?.cancel()
    setMuted(m => !m)
  }

  useEffect(() => {
    return () => {
      synthRef.current?.cancel()
      ctxRef.current?.close()
    }
  }, [])

  return { muted, toggleMute, cue, cancel }
}
