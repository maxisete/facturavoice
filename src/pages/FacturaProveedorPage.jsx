import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Plus } from 'lucide-react'
import { formatearEuros } from '../lib/document'

export default function FacturaProveedorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const factura = location.state?.factura
  const [seleccionadas, setSeleccionadas] = useState([])
  const [tipoDoc, setTipoDoc] = useState('presupuesto')

  if (!factura) {
    navigate('/compras')
    return null
  }

  const toggleLinea = (i) => {
    setSeleccionadas(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    )
  }

  const toggleTodas = () => {
    if (seleccionadas.length === factura.lineas.length) {
      setSeleccionadas([])
    } else {
      setSeleccionadas(factura.lineas.map((_, i) => i))
    }
  }

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
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/compras')} className="text-gray-400">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{factura.nombre_proveedor}</p>
          <p className="text-xs text-gray-400">{factura.numero_factura} · {factura.fecha_factura}</p>
        </div>
        <p className="font-mono font-medium text-brand">{factura.total?.toFixed(2)} €</p>
      </header>

      <div className="px-5 py-5 space-y-4 max-w-lg mx-auto">
        {/* Selector de líneas */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Artículos</p>
            <button onClick={toggleTodas} className="text-xs text-brand font-medium">
              {seleccionadas.length === factura.lineas.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>

          {factura.lineas.map((l, i) => (
            <div
              key={i}
              onClick={() => toggleLinea(i)}
              className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                seleccionadas.includes(i) ? 'bg-orange-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  seleccionadas.includes(i) ? 'border-brand bg-brand' : 'border-gray-300'
                }`}>
                  {seleccionadas.includes(i) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{l.descripcion}</p>
                  {l.referencia && <p className="text-xs text-gray-400">Ref: {l.referencia}</p>}
                  <div className="flex gap-4 mt-1">
                    <p className="text-xs text-gray-500">Cant: {l.cantidad}</p>
                    <p className="text-xs text-gray-500">Neto: {formatearEuros(l.precio_neto)}</p>
                    {l.pvp && <p className="text-xs text-brand font-medium">PVP: {formatearEuros(l.pvp)}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selector tipo + Botón importar */}
        {seleccionadas.length > 0 && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-xs text-gray-400 uppercase tracking-wide">Tipo de documento</p>
              <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                {['presupuesto', 'factura', 'albaran'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTipoDoc(t)}
                    className={`py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                      tipoDoc === t ? 'border-brand bg-orange-50 text-brand' : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {t === 'presupuesto' ? 'Presupuesto' : t === 'factura' ? 'Factura' : 'Albarán'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleImportar}
              className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-brand transition-colors"
            >
              <Plus size={22} />
              Importar {seleccionadas.length} artículo{seleccionadas.length !== 1 ? 's' : ''} a nuevo documento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}