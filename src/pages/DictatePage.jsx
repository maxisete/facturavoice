import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mic, MicOff, ChevronLeft, AlertCircle, User, Zap } from 'lucide-react'
import { useVoice } from '../hooks/useVoice'
import { parseDictation } from '../lib/groq'
import { crearDocumentoVacio, calcularTotales } from '../lib/document'
import { useAppStore } from '../store/appStore'
import ClientesPage from './ClientesPage'

export default function DictatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const tipo = location.state?.tipo || 'presupuesto'
  const lineasImportadas = location.state?.lineasImportadas || null

  const { getSiguienteNumero, incrementarContador } = useAppStore()
  const { grabando, transcripcion, transcripcionRef, error, duracion, nivelAudio, formatearDuracion, iniciarGrabacion, detenerGrabacion } = useVoice()

  const [procesando, setProcesando] = useState(false)
  const [pasoActual, setPasoActual] = useState('')
  const [errorProceso, setErrorProceso] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [mostrarClientes, setMostrarClientes] = useState(false)

  const handleBotonMic = async () => {
    if (grabando) {
      detenerGrabacion()
      await esperar(3000)
      await procesarTranscripcion()
    } else {
      setErrorProceso(null)
      iniciarGrabacion()
    }
  }

  const procesarTranscripcion = async () => {
    const texto = transcripcionRef.current.trim()
    if (!texto && !lineasImportadas) {
      setErrorProceso('No te oímos bien, prueba de nuevo.')
      return
    }
    try {
      setProcesando(true)
      setPasoActual('Transcribiendo…')
      await esperar(500)
      setPasoActual('Estructurando…')
      const resultado = await parseDictation(texto)
      setPasoActual('Generando documento…')
      await esperar(400)
      const numero = getSiguienteNumero(tipo)
      incrementarContador(tipo)
      const clienteFinal = cliente || { id: 'prueba', nombre: 'Cliente de prueba' }
      const doc = crearDocumentoVacio(tipo, clienteFinal, numero)
      const lineasDictado = (resultado.lines || []).map(l => ({
        ...l,
        vat_rate: tipo === 'albaran' ? 0 : (l.vat_rate || 21)
      }))
      doc.lineas = lineasImportadas ? [...lineasImportadas, ...lineasDictado] : lineasDictado
      doc.condiciones_pago = resultado.payment_terms
      doc.notas = resultado.notes
      doc.totales = calcularTotales(doc.lineas)
      navigate('/documento', { state: { documento: doc } })
    } catch (err) {
      setErrorProceso('Hubo un problema al procesar el dictado. Inténtalo de nuevo.')
      console.error(err)
    } finally {
      setProcesando(false)
      setPasoActual('')
    }
  }

  const tipoLabel = tipo.toUpperCase()
  const barras = [0, 1, 2, 3, 4, 5, 6]

  if (mostrarClientes) {
    return <ClientesPage onSeleccionar={(c) => { setCliente(c); setMostrarClientes(false) }} />
  }

  return (
    <div className="min-h-screen bg-void flex flex-col"
      style={{
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}
    >
      {/* Header */}
      <header className="flex items-center px-5 pt-10 pb-4"
        style={{ borderBottom: '1px solid rgba(0,245,255,0.1)' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-neon-cyan">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-orbitron font-bold text-white ml-1 neon-cyan">{tipoLabel}</h1>
      </header>

      {/* Selector cliente */}
      <div className="px-5 py-3">
        <button
          onClick={() => setMostrarClientes(true)}
          className="flex items-center gap-2 w-full card-dark rounded-xl px-4 py-3 transition-all"
        >
          <User size={16} className="text-neon-cyan flex-shrink-0" style={{ filter: 'drop-shadow(0 0 4px #00f5ff)' }} />
          <span className="text-sm font-mono text-gray-400 flex-1 text-left">
            {cliente ? cliente.nombre : 'Elegir cliente…'}
          </span>
          <span className="text-xs font-mono text-neon-cyan">CAMBIAR</span>
        </button>
      </div>

      {/* Zona principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-8">

        {!procesando && (
          <div className="text-center">
            <p className="text-xl font-orbitron font-bold text-white">
              {grabando ? (
                <span className="neon-cyan text-neon-cyan flicker">ESCUCHANDO...</span>
              ) : (
                'PULSA Y DICTA'
              )}
            </p>
            <p className="text-gray-600 mt-1 text-sm font-mono">
              {grabando ? 'Pulsa de nuevo para terminar' : 'Describe lo que quieres cobrar'}
            </p>
          </div>
        )}

        {/* Botón micrófono */}
        <div className="relative flex items-center justify-center">
          {grabando && (
            <>
              <div className="absolute rounded-full animate-ping"
                style={{
                  width: `${140 + nivelAudio * 40}px`,
                  height: `${140 + nivelAudio * 40}px`,
                  background: 'rgba(0,245,255,0.1)'
                }}
              />
              <div className="absolute rounded-full"
                style={{
                  width: `${160 + nivelAudio * 40}px`,
                  height: `${160 + nivelAudio * 40}px`,
                  background: 'rgba(0,245,255,0.05)'
                }}
              />
            </>
          )}

          <button
            onClick={handleBotonMic}
            disabled={procesando}
            className="relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
            style={grabando ? {
              background: 'rgba(0,245,255,0.1)',
              border: '2px solid #00f5ff',
              boxShadow: '0 0 30px rgba(0,245,255,0.4), inset 0 0 20px rgba(0,245,255,0.1)'
            } : procesando ? {
              background: 'rgba(255,255,255,0.05)',
              border: '2px solid rgba(255,255,255,0.1)'
            } : {
              background: 'linear-gradient(135deg, #FF5C39, #ff2d00)',
              boxShadow: '0 0 30px rgba(255,92,57,0.5), 0 0 60px rgba(255,92,57,0.2)'
            }}
          >
            {grabando ? (
              <>
                <div className="flex items-end gap-0.5 h-7">
                  {barras.map(i => (
                    <div key={i} className="w-1.5 rounded-full animate-bounce"
                      style={{
                        height: `${12 + nivelAudio * 16}px`,
                        background: '#00f5ff',
                        boxShadow: '0 0 4px #00f5ff',
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
                <MicOff size={16} className="text-neon-cyan opacity-70" />
              </>
            ) : (
              <Mic size={36} className={procesando ? 'text-gray-600' : 'text-white'} />
            )}
          </button>
        </div>

        {/* Cronómetro */}
        {grabando && (
          <p className="font-orbitron text-2xl font-bold text-neon-cyan neon-cyan">
            {formatearDuracion(duracion)}
          </p>
        )}

        {/* Procesando */}
        {procesando && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: '#00f5ff', boxShadow: '0 0 6px #00f5ff', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-neon-cyan font-orbitron text-xs tracking-widest">{pasoActual.toUpperCase()}</p>
          </div>
        )}

        {/* Transcripción en tiempo real */}
        {grabando && transcripcion && (
          <div className="w-full max-w-sm card-dark rounded-xl p-4">
            <p className="text-sm text-gray-400 font-mono">{transcripcion}</p>
          </div>
        )}

        {/* Errores */}
        {(errorProceso || error) && (
          <div className="flex items-start gap-3 rounded-xl px-4 py-3 w-full max-w-sm"
            style={{ background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)' }}
          >
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 font-mono">{errorProceso || error}</p>
          </div>
        )}
      </div>

      {/* Ejemplo */}
      {!grabando && !procesando && (
        <div className="px-5 pb-10 text-center">
          <p className="text-xs text-gray-700 font-mono italic">
            // "Dos días de pintura a 350 euros cada uno más IVA, plazo 15 días"
          </p>
        </div>
      )}
    </div>
  )
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}