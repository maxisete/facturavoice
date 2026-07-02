import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, Truck, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatearEuros, formatearFecha } from '../lib/document'
import { useAppStore } from '../store/appStore'

const TIPOS = [
  { id: 'presupuesto', label: 'Presupuesto', icono: FileText },
  { id: 'factura', label: 'Factura', icono: Receipt },
  { id: 'albaran', label: 'Albarán', icono: Truck },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState('presupuesto')
  const [recientes, setRecientes] = useState([])
  const { negocio } = useAppStore()
  const [nombreUsuario, setNombreUsuario] = useState('')

  useEffect(() => {
    if (negocio?.nombre_usuario) setNombreUsuario(negocio.nombre_usuario)
  }, [negocio])

  useEffect(() => {
    const cargarRecientes = async () => {
      const { data, error } = await supabase
        .from('documentos')
        .select('id, tipo, numero, cliente, totales, fecha')
        .order('created_at', { ascending: false })
        .limit(5)
      if (!error && data) setRecientes(data)
    }
    cargarRecientes()
  }, [])
  useEffect(() => {
    const comprobarPresupuestosPendientes = async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const hace7dias = new Date()
      hace7dias.setDate(hace7dias.getDate() - 7)
      const { data } = await supabase
        .from('documentos')
        .select('id, numero, cliente, fecha')
        .eq('tipo', 'presupuesto')
        .eq('facturado', false)
        .lt('fecha', hace7dias.toISOString())
      if (data && data.length > 0) {
        new Notification('FacturaVoice', {
          body: `Tienes ${data.length} presupuesto${data.length > 1 ? 's' : ''} pendiente${data.length > 1 ? 's' : ''} de facturar desde hace más de 7 días.`,
          icon: '/icon-192.png'
        })
      }
    }
    comprobarPresupuestosPendientes()
  }, [])

  return (
    <div className="min-h-screen bg-void px-5 pt-12 pb-8">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-orbitron text-neon-cyan tracking-widest uppercase mb-1 flicker">
          FACTURAVOICE // SYS_ONLINE
        </p>
        <h1 className="text-3xl font-orbitron font-bold text-white">
          HOLA{' '}
          <span className="neon-cyan text-neon-cyan">
            {nombreUsuario.toUpperCase() || 'USUARIO'}
          </span>
        </h1>
        <p className="text-gray-500 text-sm mt-1 font-mono">¿Qué generamos hoy?</p>
      </div>

      {/* Selector de tipo */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {TIPOS.map(({ id, label, icono: Icono }) => (
          <button
            key={id}
            onClick={() => setTipo(id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
              tipo === id
                ? 'border-neon-cyan bg-neon-cyan/10 shadow-neon-cyan'
                : 'border-white/10 bg-white/[0.03] hover:border-neon-cyan/40'
            }`}
          >
            <Icono size={22} className={tipo === id ? 'text-neon-cyan' : 'text-gray-500'} />
            <span className={`text-xs font-mono ${tipo === id ? 'text-neon-cyan neon-cyan' : 'text-gray-500'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Botón nuevo documento */}
      <button
        onClick={() => navigate('/dictar', { state: { tipo } })}
        className="w-full flex items-center justify-center gap-3 btn-neon-solid text-white py-4 rounded-xl font-orbitron font-bold text-sm tracking-widest"
      >
        <Zap size={18} />
        NUEVO {tipo.toUpperCase()}
      </button>

      {/* Recientes */}
      {recientes.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-orbitron text-neon-cyan/50 tracking-widest uppercase mb-3">
            // RECIENTES
          </p>
          <div className="space-y-2">
            {recientes.map(doc => (
              <div
                key={doc.id}
                onClick={() => navigate('/documento', { state: { documento: doc } })}
                className="card-dark rounded-xl p-4 flex items-center justify-between cursor-pointer scanline"
              >
                <div>
                  <p className="font-mono font-medium text-white text-sm">{doc.numero}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {doc.cliente?.nombre} · {formatearFecha(doc.fecha)}
                  </p>
                </div>
                <p className="font-orbitron font-bold text-neon-orange text-sm">
                  {formatearEuros(doc.totales?.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}