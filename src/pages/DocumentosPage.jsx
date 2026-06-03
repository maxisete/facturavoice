import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, Truck, CheckSquare, Users, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatearEuros, formatearFecha } from '../lib/document'
import { useAppStore } from '../store/appStore'

const TABS = [
  { id: 'presupuesto', label: 'Presupuestos', icono: FileText },
  { id: 'factura', label: 'Facturas', icono: Receipt },
  { id: 'albaran', label: 'Albaranes', icono: Truck },
  { id: 'clientes', label: 'Clientes', icono: Users },
]

export default function DocumentosPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('presupuesto')
  const [documentos, setDocumentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])
  const { getSiguienteNumero, incrementarContador } = useAppStore()
  const [clientesConDocs, setClientesConDocs] = useState([])
  const [clienteAbierto, setClienteAbierto] = useState(null)

  useEffect(() => {
    cargarDocumentos()
    setModoSeleccion(false)
    setSeleccionados([])
  }, [tab])

  const cargarDocumentos = async () => {
    setCargando(true)
    if (tab === 'clientes') {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        const agrupados = {}
        data.forEach(doc => {
          const nombre = doc.cliente?.nombre || 'Sin cliente'
          if (!agrupados[nombre]) agrupados[nombre] = []
          agrupados[nombre].push(doc)
        })
        setClientesConDocs(Object.entries(agrupados).map(([nombre, docs]) => ({ nombre, docs })))
      }
    } else {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('tipo', tab)
        .order('created_at', { ascending: false })
      if (!error && data) setDocumentos(data)
    }
    setCargando(false)
  }

  const toggleSeleccion = (doc) => {
  setSeleccionados(prev => {
    if (prev.find(d => d.id === doc.id)) {
      return prev.filter(d => d.id !== doc.id)
    }
    if (prev.length > 0 && prev[0].cliente?.nombre !== doc.cliente?.nombre) {
      return prev // bloquear: es de otro cliente
    }
    return [...prev, doc]
  })
}

  const handleConvertirEnFactura = async () => {
    if (seleccionados.length === 0) return

    const iva = 21
    const lineas = seleccionados.map(alb => {
      const base = alb.totales?.subtotal || 0
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

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await Promise.all(seleccionados.map(alb =>
        supabase.from('documentos').update({ facturado: true }).eq('id', alb.id)
      ))
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

        {!cargando && tab === 'clientes' && clientesConDocs.map(({ nombre, docs }) => {
          const albaranesCliente = docs.filter(d => d.tipo === 'albaran')
          const modoSelCliente = modoSeleccion && seleccionados.length > 0 && seleccionados[0].cliente?.nombre === nombre
          return (
            <div key={nombre} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setClienteAbierto(clienteAbierto === nombre ? null : nombre)}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                    <Users size={14} className="text-brand" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{nombre}</p>
                    <p className="text-xs text-gray-400">{docs.length} documento{docs.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {albaranesCliente.length > 0 && clienteAbierto === nombre && !modoSeleccion && (
                    <button
                      onClick={() => setModoSeleccion(true)}
                      className="flex items-center gap-1 text-xs text-brand font-medium"
                    >
                      <CheckSquare size={14} />
                      Seleccionar
                    </button>
                  )}
                  {modoSelCliente && (
                    <button
                      onClick={() => { setModoSeleccion(false); setSeleccionados([]) }}
                      className="text-xs text-gray-400 font-medium"
                    >
                      Cancelar
                    </button>
                  )}
                  {clienteAbierto === nombre ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
              </div>
              {clienteAbierto === nombre && (
                <div className="border-t border-gray-100">
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => {
                        if (modoSeleccion && doc.tipo === 'albaran' && !doc.facturado) {
                          toggleSeleccion(doc)
                        } else if (!modoSeleccion) {
                          navigate('/documento', { state: { documento: doc } })
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                        doc.facturado ? 'opacity-40' :
                        seleccionados.find(d => d.id === doc.id) ? 'bg-orange-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {modoSeleccion && doc.tipo === 'albaran' && (
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
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.numero}</p>
                          <p className="text-xs text-gray-400">{formatearFecha(doc.fecha)} · {doc.tipo}</p>
                        </div>
                        <p className="font-mono text-sm font-medium text-brand">{formatearEuros(doc.totales?.total)}</p>
                      </div>
                    </div>
                  ))}
                  {modoSeleccion && seleccionados.length > 0 && seleccionados[0].cliente?.nombre === nombre && (
                    <button
                      onClick={handleConvertirEnFactura}
                      className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 font-semibold text-sm hover:bg-brand transition-colors"
                    >
                      Convertir {seleccionados.length} albarán{seleccionados.length !== 1 ? 'es' : ''} en factura
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
        
        {!cargando && documentos.map(doc => {
          const bloqueado = modoSeleccion && seleccionados.length > 0 && !seleccionados.find(d => d.id === doc.id) && seleccionados[0].cliente?.nombre !== doc.cliente?.nombre
          return (
          <div
            key={doc.id}
            onClick={() => {
              if (modoSeleccion && !bloqueado && !doc.facturado) {
                toggleSeleccion(doc)
              } else if (!modoSeleccion || bloqueado || doc.facturado) {
                navigate('/documento', { state: { documento: doc } })
              }
            }}
            className={`bg-white rounded-2xl p-4 border cursor-pointer transition-colors ${
              bloqueado ? 'opacity-30' :
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
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{doc.numero}</p>
                  <p className="text-xs text-gray-400">{doc.cliente?.nombre} · {formatearFecha(doc.fecha)}</p>
                </div>
                <p className="font-mono font-medium text-brand text-sm">{formatearEuros(doc.totales?.total)}</p>
              </div>
            </div>
          </div>
        )})}

        {modoSeleccion && seleccionados.length > 0 && (
          <button
            onClick={handleConvertirEnFactura}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-brand transition-colors mt-4"
          >
            Convertir {seleccionados.length} albarán{seleccionados.length !== 1 ? 'es' : ''} en factura
          </button>
        )}
      </div>
    </div>
  )
}