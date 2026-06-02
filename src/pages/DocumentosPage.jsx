import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, Truck, CheckSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatearEuros, formatearFecha } from '../lib/document'
import { useAppStore } from '../store/appStore'

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
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])
  const { getSiguienteNumero, incrementarContador } = useAppStore()

  useEffect(() => {
    cargarDocumentos()
    setModoSeleccion(false)
    setSeleccionados([])
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

  const toggleSeleccion = (doc) => {
    setSeleccionados(prev =>
      prev.find(d => d.id === doc.id)
        ? prev.filter(d => d.id !== doc.id)
        : [...prev, doc]
    )
  }

  const handleConvertirEnFactura = () => {
    if (seleccionados.length === 0) return

    const iva = 21
    const lineas = seleccionados.map(alb => {
      const base = alb.totales?.total || 0
      return {
        reference: alb.numero,
        description: `Albarán ${alb.numero} — ${alb.cliente?.nombre || ''}`,
        quantity: 1,
        unit_price: base,
        vat_rate: iva,
      }
    })

    const numero = getSiguienteNumero('factura')
    incrementarContador('factura')

    const factura = {
      id: crypto.randomUUID(),
      tipo: 'factura',
      numero,
      cliente: seleccionados[0].cliente,
      lineas,
      fecha: new Date().toISOString(),
      notas: null,
      totales: { subtotal: 0, desgloseIva: [], totalIva: 0, total: 0 },
    }

    navigate('/documento', { state: { documento: factura } })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          {tab === 'albaran' && !modoSeleccion && (
            <button
              onClick={() => setModoSeleccion(true)}
              className="flex items-center gap-1 text-sm text-brand font-medium"
            >
              <CheckSquare size={16} />
              Seleccionar
            </button>
          )}
          {modoSeleccion && (
            <button
              onClick={() => { setModoSeleccion(false); setSeleccionados([]) }}
              className="text-sm text-gray-400 font-medium"
            >
              Cancelar
            </button>
          )}
        </div>
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
            onClick={() => modoSeleccion ? toggleSeleccion(doc) : navigate('/documento', { state: { documento: doc } })}
            className={`bg-white rounded-2xl p-4 border cursor-pointer transition-colors ${
              seleccionados.find(d => d.id === doc.id)
                ? 'border-brand bg-orange-50'
                : 'border-gray-100 hover:border-brand'
            }`}
          >
            <div className="flex items-center gap-3">
              {modoSeleccion && (
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  seleccionados.find(d => d.id === doc.id) ? 'border-brand bg-brand' : 'border-gray-300'
                }`}>
                  {seleccionados.find(d => d.id === doc.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
              <div className="flex-1 flex items-center justify-b