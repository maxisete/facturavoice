import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Download, Plus, X } from 'lucide-react'
import { calcularTotales, formatearEuros, formatearFecha } from '../lib/document'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'

export default function DocumentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [doc, setDoc] = useState(location.state?.documento || null)
  const [generando, setGenerando] = useState(false)
  const { negocio } = useAppStore()

  useEffect(() => {
    if (!doc) navigate('/')
  }, [])

  if (!doc) return null

  useEffect(() => {
  if (!doc) return
  const guardarEnSupabase = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('documentos').upsert({
      id: doc.id,
      user_id: user.id,
      tipo: doc.tipo,
      numero: doc.numero,
      cliente: doc.cliente,
      lineas: doc.lineas,
      totales: doc.totales,
      fecha: doc.fecha,
      notas: doc.notas || null,
    })
    if (error) console.error('Error guardando documento:', error)
    else console.log('Documento guardado OK:', doc.numero)
  }
  guardarEnSupabase()
}, [doc?.id])

  const handleDescargarPDF = async () => {
    setGenerando(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const elemento = document.getElementById('documento-preview')
      const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const ancho = pdf.internal.pageSize.getWidth()
      const alto = (canvas.height * ancho) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, ancho, alto)
      pdf.save(`${doc.tipo}-${doc.numero}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
    } finally {
      setGenerando(false)
    }
  }

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
        <button
          onClick={handleDescargarPDF}
          disabled={generando}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          <Download size={15} />
          {generando ? 'Generando…' : 'PDF'}
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
      {/* Preview oculto para el PDF */}
        <div id="documento-preview" className="bg-white p-8 rounded-2xl border border-gray-100"
          style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px' }}>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{negocio?.nombre || 'Mi Negocio'}</h2>
              {negocio?.nif && <p className="text-sm text-gray-500">{negocio.nif}</p>}
              {negocio?.direccion && <p className="text-sm text-gray-500">{negocio.direccion}{negocio?.ciudad ? `, ${negocio.ciudad}` : ''}</p>}
              {negocio?.telefono && <p className="text-sm text-gray-500">{negocio.telefono}</p>}
              {negocio?.email && <p className="text-sm text-gray-500">{negocio.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-brand">{tipoLabel.toUpperCase()}</p>
              <p className="text-gray-500">{doc.numero}</p>
              <p className="text-gray-500">{formatearFecha(doc.fecha)}</p>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase mb-1">Cliente</p>
            <p className="font-bold text-gray-900">{doc.cliente?.nombre}</p>
          </div>
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left p-3 text-xs">Descripción</th>
                <th className="text-right p-3 text-xs">Cant.</th>
                <th className="text-right p-3 text-xs">Precio</th>
                <th className="text-right p-3 text-xs">IVA</th>
                <th className="text-right p-3 text-xs">Total</th>
              </tr>
            </thead>
            <tbody>
              {doc.lineas.map((l, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-3 text-sm">{l.description}</td>
                  <td className="p-3 text-sm text-right font-mono">{l.quantity}</td>
                  <td className="p-3 text-sm text-right font-mono">{formatearEuros(l.unit_price)}</td>
                  <td className="p-3 text-sm text-right">{l.vat_rate}%</td>
                  <td className="p-3 text-sm text-right font-mono font-medium">{formatearEuros(l.quantity * l.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-48 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Base</span><span className="font-mono">{formatearEuros(doc.totales.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>IVA</span><span className="font-mono">{formatearEuros(doc.totales.totalIva)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span><span className="font-mono text-brand">{formatearEuros(doc.totales.total)}</span>
              </div>
            </div>
          </div>
          {doc.notas && <p className="mt-6 text-sm text-gray-500">{doc.notas}</p>}
        </div>
    </div>
  )
}