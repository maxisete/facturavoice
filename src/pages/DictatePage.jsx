import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mic, MicOff, ChevronLeft, AlertCircle, User } from 'lucide-react'
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
      await esperar(1500)
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

  const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1)
  const barras = [0, 1, 2, 3, 4, 5, 6]

  if (mostrarClientes) {
    return <ClientesPage onSeleccionar={(c) => { setCliente(c); setMostrarClientes(false) }} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center px-5 pt-10 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-gray-900 ml-1">{tipoLabel}</h1>
      </header>

      <div className="px-5 py-2">
        <button
          onClick={() => setMostrarClientes(true)}
          className="flex items-center gap-2 w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 hover:border-brand/30 transition-colors"
        >
          <User size={16} className="text-brand flex-shrink-0" />
          <span className="text-sm text-gray-900 flex-1 text-left">
            {cliente ? cliente.nombre : 'Elegir cliente…'}
          </span>
          <span className="text-xs text-brand">Cambiar</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-8">
        {!procesando && (
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">
              {grabando ? 'Escuchando…' : 'Pulsa y dicta'}
            </p>
            <p className="text-gray-400 mt-1 text-sm">
              {grabando ? 'Pulsa de nuevo para terminar' : 'Describe lo que quieres cobrar'}
            </p>
          </div>
        )}

        <div className="relative flex items-center justify-center">
          {grabando && (
            <>
              <div className="absolute rounded-full bg-orange-100 animate-ping"
                style={{ width: `${140 + nivelAudio * 40}px`, height: `${140 + nivelAudio * 40}px` }} />
              <div className="absolute rounded-full bg-orange-50"
                style={{ width: `${160 + nivelAudio * 40}px`, height: `${160 + nivelAudio * 40}px` }} />
            </>
          )}

          <button
            onClick={handleBotonMic}
            disabled={procesando}
            className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
              grabando ? 'bg-brand' : procesando ? 'bg-gray-200' : 'bg-gray-900 hover:bg-brand'
            }`}
          >
            {grabando ? (
              <>
                <div className="flex items-end gap-0.5 h-7">
                  {barras.map(i => (
                    <div key={i} className="w-1.5 bg-white rounded-full animate-bounce"
                      style={{ height: `${12 + nivelAudio * 16}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <MicOff size={16} className="text-white opacity-70" />
              </>
            ) : (
              <Mic size={36} className={procesando ? 'text-gray-400' : 'text-white'} />
            )}
          </button>
        </div>

        {grabando && (
          <p className="font-mono text-2xl font-medium text-brand">
            {formatearDuracion(duracion)}
          </p>
        )}

        {procesando && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-brand rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-gray-400 font-medium">{pasoActual}</p>
          </div>
        )}

        {grabando && transcripcion && (
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">{transcripcion}</p>
          </div>
        )}

        {(errorProceso || error) && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 w-full max-w-sm">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-500">{errorProceso || error}</p>
          </div>
        )}
      </div>

      {!grabando && !procesando && (
        <div className="px-5 pb-10 text-center">
          <p className="text-xs text-gray-300 italic">
            Ejemplo: "Dos días de pintura a 350 euros cada uno más IVA, plazo 15 días"
          </p>
        </div>
      )}
    </div>
  )
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}