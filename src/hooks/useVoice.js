import { useState, useRef, useCallback } from 'react'

export function useVoice() {
  const [grabando, setGrabando] = useState(false)
  const [transcripcion, setTranscripcion] = useState('')
  const [error, setError] = useState(null)
  const [duracion, setDuracion] = useState(0)
  const [nivelAudio, setNivelAudio] = useState(0)
  const transcripcionRef = useRef('')
  const recognitionRef = useRef(null)
  const estaGrabandoRef = useRef(false)
  const timerRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const streamRef = useRef(null)
  const iniciarAnalisisAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      const tick = () => {
        analyserRef.current?.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setNivelAudio(Math.min(avg / 80, 1))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // Sin acceso al micrófono para análisis visual
    }
  }

  const detenerAnalisisAudio = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (audioContextRef.current) audioContextRef.current.close()
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    setNivelAudio(0)
  }

  const iniciarGrabacion = useCallback(() => {
    setError(null)
    setTranscripcion('')
    transcripcionRef.current = ''
    setDuracion(0)

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Tu navegador no soporta reconocimiento de voz. Usa Chrome.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let textoFinal = ''
      let textoInterino = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          textoFinal += event.results[i][0].transcript
        } else {
          textoInterino += event.results[i][0].transcript
        }
      }
      if (textoFinal) {
        transcripcionRef.current = transcripcionRef.current + ' ' + textoFinal
        setTranscripcion(transcripcionRef.current)
      } else if (textoInterino) {
        setTranscripcion(transcripcionRef.current + ' ' + textoInterino)
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        setError(`Error de micrófono: ${event.error}`)
      }
    }

    recognition.onend = () => {
      if (estaGrabandoRef.current) {
        recognition.start()
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    estaGrabandoRef.current = true
    setGrabando(true)

    // iniciarAnalisisAudio() — deshabilitado en móvil por conflicto de streams

    timerRef.current = setInterval(() => {
      setDuracion(d => d + 1)
    }, 1000)
  }, [])

  const detenerGrabacion = useCallback(() => {
    return new Promise((resolve) => {
      if (recognitionRef.current) {
        estaGrabandoRef.current = false
        recognitionRef.current.onend = () => {
          resolve(transcripcionRef.current)
        }
        recognitionRef.current.stop()
      } else {
        resolve(transcripcionRef.current)
      }
      clearInterval(timerRef.current)
      // detenerAnalisisAudio()
      setGrabando(false)
    })
  }, [])

  const formatearDuracion = (segs) => {
    const m = Math.floor(segs / 60).toString().padStart(2, '0')
    const s = (segs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return {
    grabando,
    transcripcion,
    transcripcionRef,
    error,
    duracion,
    nivelAudio,
    formatearDuracion,
    iniciarGrabacion,
    detenerGrabacion,
  }
}