import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, Truck, CheckSquare, Users, ChevronDown, ChevronRight, Zap } from 'lucide-react'
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
      if (prev.find(d => d.id === doc.id)) return prev.filter(d => d.id !== doc.id)
      if (prev.length > 0 && prev[0].cliente?.nombre !== doc.cliente?.nombre) return prev
      return [...prev, doc]
    })
  }

  const handleConvertirEnFactura = async () => {
    if (seleccionados.length === 0) return
    const lineas = seleccionados.map(alb => ({
      reference: alb.numero,
      description: `Albarán ${alb.numero} — ${alb.cliente?.nombre || ''}`,
      quantity: 1,
      unit_price: alb.totales?.subtotal || 0,
      vat_rate: 21,
    }))
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
    <div className="min-h-screen bg-void pb-8">
      {/* Header */}
      <div className="px-5 pt-12 pb-0 header-tema" style={{ borderBottom: '1px solid rgba(0,245,255,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-orbitron font-bold text-white neon-cyan">DOCUMENTOS</h1>
          {tab === 'albaran' && !modoSeleccion && (
            <button onClick={() => setModoSeleccion(true)} className="flex items-center gap-1 text-xs font-mono text-neon-cyan">
              <CheckSquare size={14} />
              SELECCIONAR
            </button>
          )}
          {modoSeleccion && (
            <button onClick={() => { setModoSeleccion(false); setSeleccionados([]) }} className="text-xs font-mono text-gray-500">
              CANCELAR
            </button>
          )}
        </div>
        <div className="flex gap-0">
          {TABS.map(({ id, label, icono: Icono }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 border-b-2 transition-colors ${
                tab === id ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-gray-600'
              }`}
              style={tab === id ? { textShadow: '0 0 8px #00f5ff' } : {}}
            >
              <Icono size={16} />
              <span className="text-xs font-mono">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-2 max-w-lg mx-auto">
        {cargando && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-sm font-mono">CARGANDO...</p>
          </div>
        )}

        {/* Vista clientes */}
        {!cargando && tab === 'clientes' && clientesConDocs.map(({ nombre, docs }) => {
          const albaranesCliente = docs.filter(d => d.tipo === 'albaran')
          const modoSelCliente = modoSeleccion && seleccionados.length > 0 && seleccionados[0].cliente?.nombre === nombre
          return (
            <div key={nombre} className="card-dark rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <button onClick={() => setClienteAbierto(clienteAbierto === nombre ? null : nombre)} className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)' }}>
                    <Users size={14} className="text-neon-cyan" />
                  </div>
                  <div className="text-left">
                    <p className="font-mono font-medium text-white text-sm">{nombre}</p>
                    <p className="text-xs text-gray-600">{docs.length} documento{docs.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {albaranesCliente.length > 0 && clienteAbierto === nombre && !modoSeleccion && (
                    <button onClick={() => setModoSeleccion(true)} className="flex items-center gap-1 text-xs font-mono text-neon-cyan">
                      <CheckSquare size={12} />
                      SEL
                    </button>
                  )}
                  {modoSelCliente && (
                    <button onClick={() => { setModoSeleccion(false); setSeleccionados([]) }} className="text-xs font-mono text-gray-500">
                      CAN
                    </button>
                  )}
                  {clienteAbierto === nombre
                    ? <ChevronDown size={16} className="text-neon-cyan" />
                    : <ChevronRight size={16} className="text-gray-600" />}
                </div>
              </div>
              {clienteAbierto === nombre && (
                <div style={{ borderTop: '1px solid rgba(0,245,255,0.1)' }}>
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => {
                        if (modoSeleccion && doc.tipo === 'albaran' && !doc.facturado) toggleSeleccion(doc)
                        else if (!modoSeleccion) navigate('/documento', { state: { documento: doc } })
                      }}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                        doc.facturado ? 'opacity-30' :
                        seleccionados.find(d => d.id === doc.id)
                          ? 'bg-neon-cyan/10'
                          : 'hover:bg-white/5'
                      }`}
                      style={{ borderBottom: '1px solid rgba(0,245,255,0.05)' }}
                    >
                      {modoSeleccion && doc.tipo === 'albaran' && (
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          seleccionados.find(d => d.id === doc.id)
                            ? 'border-neon-cyan bg-neon-cyan/20'
                            : 'border-gray-600'
                        }`}>
                          {seleccionados.find(d => d.id === doc.id) && (
                            <svg className="w-3 h-3 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      )}
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-mono text-white">{doc.numero}</p>
                          <p className="text-xs text-gray-600">{formatearFecha(doc.fecha)} · {doc.tipo}</p>
                        </div>
                        <p className="font-orbitron text-sm font-bold text-neon-orange">{formatearEuros(doc.totales?.total)}</p>
                      </div>
                    </div>
                  ))}
                  {modoSeleccion && seleccionados.length > 0 && seleccionados[0].cliente?.nombre === nombre && (
                    <button
                      onClick={handleConvertirEnFactura}
                      className="w-full flex items-center justify-center gap-2 btn-neon-solid text-white py-3 font-orbitron font-bold text-xs tracking-widest"
                    >
                      <Zap size={14} />
                      CONVERTIR {seleccionados.length} ALBARÁN{seleccionados.length !== 1 ? 'ES' : ''} EN FACTURA
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Lista documentos */}
        {!cargando && documentos.map(doc => {
          const bloqueado = modoSeleccion && seleccionados.length > 0 && !seleccionados.find(d => d.id === doc.id) && seleccionados[0].cliente?.nombre !== doc.cliente?.nombre
          return (
            <div
              key={doc.id}
              onClick={() => {
                if (modoSeleccion && !bloqueado && !doc.facturado) toggleSeleccion(doc)
                else if (!modoSeleccion || bloqueado || doc.facturado) navigate('/documento', { state: { documento: doc } })
              }}
              className={`card-dark rounded-xl p-4 cursor-pointer transition-all ${
                bloqueado ? 'opacity-30' :
                seleccionados.find(d => d.id === doc.id) ? 'bg-neon-cyan/10' : ''
              }`}
              style={seleccionados.find(d => d.id === doc.id) ? { borderColor: 'rgba(0,245,255,0.5)', boxShadow: '0 0 12px rgba(0,245,255,0.15)' } : {}}
            >
              <div className="flex items-center gap-3">
                {modoSeleccion && (
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    seleccionados.find(d => d.id === doc.id) ? 'border-neon-cyan bg-neon-cyan/20' : 'border-gray-600'
                  }`}>
                    {seleccionados.find(d => d.id === doc.id) && (
                      <svg className="w-3 h-3 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-medium text-white text-sm">{doc.numero}</p>
                    <p className="text-xs text-gray-600">{doc.cliente?.nombre} · {formatearFecha(doc.fecha)}</p>
                  </div>
                  <p className="font-orbitron font-bold text-neon-orange text-sm">{formatearEuros(doc.totales?.total)}</p>
                </div>
              </div>
            </div>
          )
        })}

        {modoSeleccion && seleccionados.length > 0 && (
          <button
            onClick={handleConvertirEnFactura}
            className="w-full flex items-center justify-center gap-2 btn-neon-solid text-white py-4 rounded-xl font-orbitron font-bold text-sm tracking-widest mt-4"
          >
            <Zap size={16} />
            CONVERTIR {seleccionados.length} ALBARÁN{seleccionados.length !== 1 ? 'ES' : ''} EN FACTURA
          </button>
        )}
      </div>
    </div>
  )
}