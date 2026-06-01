import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Download, Plus, X } from 'lucide-react'
import { calcularTotales, formatearEuros, formatearFecha } from '../lib/document'

export default function DocumentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [doc, setDoc] = useState(location.state?.documento || null)

  useEffect(() => {
    if (!doc) navigate('/')
  }, [])

  if (!doc) return null

  const tipoLabel = doc.tipo === 'factura' ? 'Factura' : doc.tipo === 'presupuesto' ? 'Presupuesto' : 'Albarán'

  const actualizarLinea = (i, campo, valor) => {
    const nuevasLineas = doc.lineas.map((l, idx) =>
      idx === i ? { ...l, [campo]: valor } : l
    )
    setDoc(prev => ({ ...prev, lineas: nuevasLineas, totales: calcularTotales(nuevasLineas) }))
  }

  const añadirLinea = () => {
    const nuevasLineas = [...doc.lineas, { reference: null, description: '', quantity: 1, unit_price: 0, vat_rate: 21 }]
    setDoc(prev => ({ ...prev, lineas: nuevasLineas, totales: calcularTotales(nuevasLineas) }))
  }

  const eliminarLinea = (i) => {
    const nuevasLineas = doc.lineas.filter((_, idx) => idx !== i)
    setDoc(prev => ({ ...prev, lineas: nuevasLineas, totales: calcularTotales(nuevasLineas) }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{tipoLabel}</p>
          <p className="font-bold text-gray-900">{doc.numero}</p>
        </div>
        <button className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Download size={15} />
          PDF
        </button>
      </header>

      <div className="px-5 py-5 space-y-4 max-w-lg mx-auto">
        {/* Cliente */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Cliente</p>
          <p className="font-medium text-gray-900">{doc.cliente?.nombre}</p>
        </div>

        {/* Líneas */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Líneas</p>
            <button onClick={añadirLinea} className="flex items-center gap-1 text-brand text-sm font-medium">
              <Plus size={14} /> Añadir
            </button>
          </div>

          {doc.lineas.map((linea, i) => (
            <div key={i} className="p-4 border-b border-gray-50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <input
                  value={linea.description}
                  onChange={e => actualizarLinea(i, 'description', e.target.value)}
                  placeholder="Descripción"
                  className="flex-1 font-medium text-gray-900 bg-transparent focus:outline-none"
                />
                <button onClick={() => eliminarLinea(i)} className="text-red-300 hover:text-red-400">
                  <X size={16} />
                </button>
              </div>

              <input
                value={linea.reference || ''}
                onChange={e => actualizarLinea(i, 'reference', e.target.value || null)}
                placeholder="Ref. (opcional)"
                className="w-full text-xs text-gray-400 bg-gray-50 rounded-lg px-2.5 py-1.5 focus:outline-none"
              />

              <div className="flex gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Cant.</p>
                  <input
                    type="number"
                    value={linea.quantity}
                    onChange={e => actualizarLinea(i, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-14 text-gray-900 bg-transparent focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Precio</p>
                  <input
                    type="number"
                    value={linea.unit_price}
                    onChange={e => actualizarLinea(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-20 text-gray-900 bg-transparent focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400">IVA %</p>
                  <input
                    type="number"
                    value={linea.vat_rate}
                    onChange={e => actualizarLinea(i, 'vat_rate', parseFloat(e.target.value) || 21)}
                    className="w-12 text-gray-900 bg-transparent focus:outline-none font-mono"
                  />
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-mono font-medium text-gray-900">
                    {formatearEuros(linea.quantity * linea.unit_price)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {doc.lineas.length === 0 && (
            <p className="text-center text-gray-300 text-sm py-6">Sin líneas</p>
          )}
        </div>

        {/* Totales */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Base imponible</span>
            <span className="font-mono">{formatearEuros(doc.totales.subtotal)}</span>
          </div>
          {doc.totales.desgloseIva?.map(v => (
            <div key={v.tipo} className="flex justify-between text-sm text-gray-500">
              <span>IVA {v.tipo}%</span>
              <span className="font-mono">{formatearEuros(v.cuota)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="font-mono text-brand">{formatearEuros(doc.totales.total)}</span>
          </div>
        </div>

        {/* Notas */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Notas</p>
          <textarea
            value={doc.notas || ''}
            onChange={e => setDoc(prev => ({ ...prev, notas: e.target.value }))}
            placeholder="Condiciones, forma de pago…"
            rows={3}
            className="w-full text-sm text-gray-600 bg-transparent focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  )
}