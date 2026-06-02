import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, Truck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatearEuros, formatearFecha } from '../lib/document'

const TABS = [
  { id: 'presupuesto', label: 'Presupuestos', icono: FileText },
  { id: 'factura', label: 'Facturas', icono: Receipt },
  { id: 'albaran', label: 'Albaranes', icono: Truck },
]

export default function DocumentosPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('presupuesto')
  const [documentos, setDocumentos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDocumentos()
  }, [tab])

  const cargarDocumentos = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('tipo', tab)
      .order('created_at', { ascending: false })
    if (!error && data) setDocumentos(data)
    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Documentos</h1>
        <div className="flex gap-0">
          {TABS.map(({ id, label, icono: Icono }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 border-b-2 transition-colors ${
                tab === id ? 'border-brand text-brand' : 'border-transparent text-gray-400'
              }`}
            >
              <Icono size={18} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-2 max-w-lg mx-auto">
        {cargando && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Cargando…</p>
          </div>
        )}

        {!cargando && documentos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No hay {TABS.find(t => t.id === tab)?.label.toLowerCase()} todavía</p>
          </div>
        )}

        {!cargando && documentos.map(doc => (
          <div
            key={doc.id}
            onClick={() => navigate('/documento', { state: { documento: doc } })}
            className="bg-white rounded-2xl p-4 border border-gray-100 cursor-pointer hover:border-brand transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{doc.numero}</p>
                <p className="text-xs text-gray-400">{doc.cliente?.nombre} · {formatearFecha(doc.fecha)}</p>
              </div>
              <p className="font-mono font-medium text-brand">{formatearEuros(doc.totales?.total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}