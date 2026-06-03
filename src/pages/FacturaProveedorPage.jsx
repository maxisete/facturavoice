import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Zap } from 'lucide-react'
import { formatearEuros } from '../lib/document'

export default function FacturaProveedorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const factura = location.state?.factura
  const [seleccionadas, setSeleccionadas] = useState([])
  const [tipoDoc, setTipoDoc] = useState('presupuesto')

  if (!factura) { navigate('/compras'); return null }

  const toggleLinea = (i) => setSeleccionadas(prev =>
    prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
  )

  const toggleTodas = () => setSeleccionadas(
    seleccionadas.length === factura.lineas.length ? [] : factura.lineas.map((_, i) => i)
  )

  const handleImportar = () => {
    const lineasImportar = seleccionadas.map(i => {
      const l = factura.lineas[i]
      return {
        reference: l.referencia || null,
        description: l.descripcion || '',
        quantity: l.cantidad || 1,
        unit_price: l.pvp || l.precio_neto || 0,
        vat_rate: l.iva || 21,
      }
    })
    navigate('/dictar', { state: { lineasImportadas: lineasImportar, tipo: tipoDoc } })
  }

  return (
    <div className="min-h-screen bg-void pb-8">
      {/* Header */}
      <header className="px-5 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(0,245,255,0.15)', background: 'rgba(10,10,15,0.98)' }}
      >
        <button onClick={() => navigate('/compras')} className="text-neon-cyan">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="font-orbitron font-bold text-white text-sm">{factura.nombre_proveedor}</p>
          <p className="text-xs text-gray-600 font-mono">{factura.numero_factura} · {factura.fecha_factura}</p>
        </div>
        <p className="font-orbitron font-bold text-neon-orange">{factura.total?.toFixed(2)} €</p>
      </header>

      <div className="px-5 py-5 space-y-4 max-w-lg mx-auto">

        {/* Lista artículos */}
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(0,245,255,0.1)' }}
          >
            <p className="text-xs font-orbitron text-neon-cyan/50 tracking-widest">// ARTÍCULOS</p>
            <button onClick={toggleTodas} className="text-xs font-mono text-neon-cyan">
              {seleccionadas.length === factura.lineas.length ? 'DESELECCIONAR TODO' : 'SELECCIONAR TODO'}
            </button>
          </div>

          {factura.lineas.map((l, i) => (
            <div
              key={i}
              onClick={() => toggleLinea(i)}
              className={`px-4 py-3 cursor-pointer transition-all ${
                seleccionadas.includes(i) ? 'bg-neon-cyan/5' : 'hover:bg-white/3'
              }`}
              style={{
                borderBottom: '1px solid rgba(0,245,255,0.05)',
                ...(seleccionadas.includes(i) ? { borderLeft: '2px solid #00f5ff' } : {})
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  seleccionadas.includes(i)
                    ? 'border-neon-cyan bg-neon-cyan/20'
                    : 'border-gray-600'
                }`}>
                  {seleccionadas.includes(i) && (
                    <svg className="w-3 h-3 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-mono text-white">{l.descripcion}</p>
                  {l.referencia && <p className="text-xs text-gray-600 mt-0.5">REF: {l.referencia}</p>}
                  <div className="flex gap-4 mt-1">
                    <p className="text-xs text-gray-600">x{l.cantidad}</p>
                    <p className="text-xs text-gray-600">Neto: {formatearEuros(l.precio_neto)}</p>
                    {l.pvp && <p className="text-xs font-orbitron text-neon-orange">PVP: {formatearEuros(l.pvp)}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selector tipo + Botón importar */}
        {seleccionadas.length > 0 && (
          <div className="space-y-3">
            <div className="card-dark rounded-xl overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-xs font-orbitron text-neon-cyan/50 tracking-widest">
                // TIPO DE DOCUMENTO
              </p>
              <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                {['presupuesto', 'factura', 'albaran'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTipoDoc(t)}
                    className={`py-2 rounded-xl font-mono text-xs transition-all ${
                      tipoDoc === t
                        ? 'text-neon-cyan'
                        : 'text-gray-600 hover:text-gray-400'
                    }`}
                    style={tipoDoc === t ? {
                      background: 'rgba(0,245,255,0.1)',
                      border: '1px solid rgba(0,245,255,0.4)',
                      boxShadow: '0 0 10px rgba(0,245,255,0.1)'
                    } : {
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    {t === 'presupuesto' ? 'PRESUPU.' : t === 'factura' ? 'FACTURA' : 'ALBARÁN'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleImportar}
              className="w-full flex items-center justify-center gap-3 btn-neon-solid text-white py-4 rounded-xl font-orbitron font-bold text-sm tracking-widest"
            >
              <Zap size={18} />
              IMPORTAR {seleccionadas.length} ARTÍCULO{seleccionadas.length !== 1 ? 'S' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}