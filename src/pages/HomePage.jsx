import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, Truck, Plus } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-gray-50 px-5 pt-12 pb-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola {nombreUsuario || ''} 👋
        </h1>
      </div>
      <p className="text-gray-500 mb-8">¿Qué necesitas hoy?</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {TIPOS.map(({ id, label, icono: Icono }) => (
          <button
            key={id}
            onClick={() => setTipo(id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              tipo === id ? 'border-brand bg-orange-50' : 'border-gray-200 bg-white'
            }`}
          >
            <Icono size={22} className={tipo === id ? 'text-brand' : 'text-gray-400'} />
            <span className={`text-xs font-medium ${tipo === id ? 'text-brand' : 'text-gray-500'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/dictar', { state: { tipo } })}
        className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-brand transition-colors"
      >
        <Plus size={22} />
        Nuevo {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </button>

      {recientes.length > 0 && (
        <div className="mt-8">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Recientes</p>
          <div className="space-y-2">
            {recientes.map(doc => (
              <div
                key={doc.id}
                onClick={() => navigate('/documento', { state: { documento: doc } })}
                className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between cursor-pointer hover:border-brand transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{doc.numero}</p>
                  <p className="text-xs text-gray-400">{doc.cliente?.nombre} · {formatearFecha(doc.fecha)}</p>
                </div>
                <p className="font-mono font-medium text-brand text-sm">{formatearEuros(doc.totales?.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}