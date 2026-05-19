import { useState, useRef, useCallback, useEffect } from 'react'

export function useVisualizationAudio() {
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

  const getVoice = () => {
    const voices = synthRef.current?.getVoices() ?? []
    return voices.find(v => v.lang.startsWith('es')) ?? null
  }

  // Soft low bell — calmer than mindfulness bell
  const playBell = useCallback(() => {
    if (muted) return
    try {
      const ctx = getCtx()
      ;[440, 660].forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(i === 0 ? 0.07 : 0.035, ctx.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 2.5)
      })
    } catch { /* ignore */ }
  }, [muted])

  // Speak scene text; calls onEnd when finished (or after timeout fallback)
  const speakScene = useCallback((text, onEnd) => {
    if (!synthRef.current) { onEnd?.(); return }
    if (muted) { onEnd?.(); return }
    synthRef.current.cancel()
    const utter   = new SpeechSynthesisUtterance(text)
    utter.lang    = 'es-ES'
    utter.rate    = 0.72
    utter.pitch   = 1.0
    utter.volume  = 1.0
    const v = getVoice()
    if (v) utter.voice = v
    if (onEnd) {
      utter.onend   = onEnd
      utter.onerror = onEnd
    }
    synthRef.current.speak(utter)
  }, [muted])

  // Scene cue: bell → pause → speak
  const cueScene = useCallback((text, onEnd) => {
    playBell()
    setTimeout(() => speakScene(text, onEnd), 1400)
  }, [playBell, speakScene])

  // Completion cue
  const cueComplete = useCallback(() => {
    playBell()
    setTimeout(() => speakScene('Viaje completado. Llevas esta calma contigo. Puedes volver a este lugar siempre que lo necesites.'), 1400)
  }, [playBell, speakScene])

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

  return { muted, toggleMute, cueScene, cueComplete, cancel }
}
