import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Download, Plus, X, Zap } from 'lucide-react'
import { calcularTotales, formatearEuros, formatearFecha } from '../lib/document'
import { useAppStore } from '../store/appStore'
import { registrarAccion } from '../lib/auditoria'
import { supabase } from '../lib/supabase'

export default function DocumentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const docRaw = location.state?.documento || null
  const lineasIniciales = (docRaw?.lineas || []).map(l => ({
    ...l,
    vat_rate: docRaw?.tipo === 'albaran' ? 0 : (l.vat_rate || 21)
  }))
  const [doc, setDoc] = useState(docRaw ? {
    ...docRaw,
    lineas: lineasIniciales,
    totales: calcularTotales(lineasIniciales),
  } : null)
  const [generando, setGenerando] = useState(false)
  const { negocio, plantillaPDF, getSiguienteNumero, incrementarContador } = useAppStore()
  const soloLectura = doc?.tipo === 'factura' || (doc?.tipo === 'albaran' && doc?.facturado)

  useEffect(() => { if (!doc) navigate('/') }, [])
  if (!doc) return null

  useEffect(() => {
    if (!doc) return
    const guardarEnSupabase = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('documentos').upsert({
        id: doc.id, user_id: user.id, tipo: doc.tipo, numero: doc.numero,
        cliente: doc.cliente, lineas: doc.lineas, totales: doc.totales,
        fecha: doc.fecha, notas: doc.notas || null,
      })
      await registrarAccion('guardar_documento', { tipo: doc.tipo, numero: doc.numero, cliente: doc.cliente?.nombre })
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
    const nuevasLineas = doc.lineas.map((l, idx) => idx === i ? { ...l, [campo]: valor } : l)
    setDoc(prev => ({ ...prev, lineas: nuevasLineas, totales: calcularTotales(nuevasLineas) }))
  }

  const añadirLinea = () => {
    const nuevasLineas = [...doc.lineas, { reference: null, description: '', quantity: 1, unit_price: 0, vat_rate: doc.tipo === 'albaran' ? 0 : 21 }]
    setDoc(prev => ({ ...prev, lineas: nuevasLineas, totales: calcularTotales(nuevasLineas) }))
  }

  const eliminarLinea = (i) => {
    const nuevasLineas = doc.lineas.filter((_, idx) => idx !== i)
    setDoc(prev => ({ ...prev, lineas: nuevasLineas, totales: calcularTotales(nuevasLineas) }))
  }

  const handleConvertirAFactura = () => {
    const numero = getSiguienteNumero('factura')
    incrementarContador('factura')
    const factura = { ...doc, id: crypto.randomUUID(), tipo: 'factura', numero, fecha: new Date().toISOString() }
    navigate('/')
    setTimeout(() => navigate('/documento', { state: { documento: factura } }), 150)
  }

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="px-5 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(0,245,255,0.15)', background: 'rgba(10,10,15,0.98)' }}
      >
        <button onClick={() => navigate(-1)} className="text-neon-cyan">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="text-xs font-mono text-gray-600">{tipoLabel.toUpperCase()}</p>
          <p className="font-orbitron font-bold text-white">{doc.numero}</p>
        </div>
        <button
          onClick={handleDescargarPDF}
          disabled={generando}
          className="flex items-center gap-2 btn-neon-solid text-white px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest disabled:opacity-50"
        >
          <Download size={14} />
          {generando ? 'GENERANDO...' : 'PDF'}
        </button>
      </header>

      <div className="px-5 py-5 space-y-4 max-w-lg mx-auto">

        {/* Cliente */}
        <div className="card-dark rounded-xl p-4">
          <p className="text-xs font-orbitron text-neon-cyan/50 tracking-widest mb-1">// CLIENTE</p>
          <p className="font-mono font-medium text-white">{doc.cliente?.nombre}</p>
        </div>

        {/* Líneas */}
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(0,245,255,0.1)' }}
          >
            <p className="text-xs font-orbitron text-neon-cyan/50 tracking-widest">// LÍNEAS</p>
            {!soloLectura && (
              <button onClick={añadirLinea} className="flex items-center gap-1 text-xs font-mono text-neon-cyan">
                <Plus size={12} />
                AÑADIR
              </button>
            )}
          </div>

          {doc.lineas.map((linea, i) => (
            <div key={i} className="p-4 space-y-2" style={{ borderBottom: '1px solid rgba(0,245,255,0.05)' }}>
              <div className="flex items-start justify-between gap-2">
                <input
                  value={linea.description}
                  onChange={e => !soloLectura && actualizarLinea(i, 'description', e.target.value)}
                  placeholder="Descripción"
                  readOnly={soloLectura}
                  className="flex-1 font-mono text-white bg-transparent focus:outline-none placeholder-gray-700"
                />
                {!soloLectura && (
                  <button onClick={() => eliminarLinea(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-xs font-mono text-gray-600">Cant.</p>
                  <input
                    type="number"
                    value={linea.quantity}
                    onChange={e => !soloLectura && actualizarLinea(i, 'quantity', parseFloat(e.target.value) || 0)}
                    readOnly={soloLectura}
                    className="w-14 text-white bg-transparent focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-600">Precio</p>
                  <input
                    type="number"
                    value={linea.unit_price}
                    onChange={e => !soloLectura && actualizarLinea(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    readOnly={soloLectura}
                    className="w-24 text-white bg-transparent focus:outline-none font-mono"
                  />
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-mono text-gray-600">Total</p>
                  <p className="font-orbitron font-bold text-neon-orange text-sm">
                    {formatearEuros(linea.quantity * linea.unit_price)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {doc.lineas.length === 0 && (
            <p className="text-center text-gray-700 text-sm font-mono py-6">// Sin líneas</p>
          )}
        </div>

        {/* Totales */}
        <div className="card-dark rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm font-mono text-gray-600">
            <span>Base imponible</span>
            <span>{formatearEuros(doc.totales.subtotal)}</span>
          </div>
          {(doc.totales.desgloseIva || []).map(v => (
            <div key={v.tipo} className="flex justify-between text-sm font-mono text-gray-600">
              <span>IVA {v.tipo}%</span>
              <span>{formatearEuros(v.cuota)}</span>
            </div>
          ))}
          <div className="flex justify-between font-orbitron font-bold pt-2"
            style={{ borderTop: '1px solid rgba(0,245,255,0.1)' }}
          >
            <span className="text-white">TOTAL</span>
            <span className="text-neon-orange" style={{ textShadow: '0 0 10px #FF5C39' }}>
              {formatearEuros(doc.totales.total)}
            </span>
          </div>
        </div>

        {/* Convertir a factura */}
        {doc.tipo === 'presupuesto' && (
          <button
            onClick={handleConvertirAFactura}
            className="w-full flex items-center justify-center gap-2 btn-neon text-neon-cyan py-3 rounded-xl font-orbitron font-bold text-sm tracking-widest transition-all"
          >
            <Zap size={16} />
            CONVERTIR A FACTURA
          </button>
        )}

        {/* Notas */}
        <div className="card-dark rounded-xl p-4">
          <p className="text-xs font-orbitron text-neon-cyan/50 tracking-widest mb-2">// NOTAS</p>
          <textarea
            value={doc.notas || ''}
            onChange={e => !soloLectura && setDoc(prev => ({ ...prev, notas: e.target.value }))}
            placeholder="Condiciones, forma de pago…"
            readOnly={soloLectura}
            rows={3}
            className="w-full text-sm text-gray-400 font-mono bg-transparent focus:outline-none resize-none placeholder-gray-700"
          />
        </div>
      </div>

      {/* Preview oculto para el PDF */}
      <div id="documento-preview" style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px' }}>
        {plantillaPDF === 'clasica' && (
          <div className="bg-white p-8">
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
                    <td className="p-3 text-sm text-gray-900">{l.description}</td>
                    <td className="p-3 text-sm text-right font-mono text-gray-900">{l.quantity}</td>
                    <td className="p-3 text-sm text-right font-mono text-gray-900">{formatearEuros(l.unit_price)}</td>
                    <td className="p-3 text-sm text-right text-gray-900">{l.vat_rate}%</td>
                    <td className="p-3 text-sm text-right font-mono font-medium text-gray-900">{formatearEuros(l.quantity * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-sm text-gray-500"><span>Base</span><span className="font-mono">{formatearEuros(doc.totales.subtotal)}</span></div>
                <div className="flex justify-between text-sm text-gray-500"><span>IVA</span><span className="font-mono">{formatearEuros(doc.totales.totalIva)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span className="font-mono text-brand">{formatearEuros(doc.totales.total)}</span></div>
              </div>
            </div>
            {doc.notas && <p className="mt-6 text-sm text-gray-500">{doc.notas}</p>}
          </div>
        )}

        {plantillaPDF === 'minimal' && (
          <div className="bg-white p-12">
            <div className="mb-10">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{tipoLabel}</p>
              <p className="text-4xl font-light text-gray-900">{doc.numero}</p>
              <p className="text-sm text-gray-400 mt-1">{formatearFecha(doc.fecha)}</p>
            </div>
            <div className="flex justify-between mb-10">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">De</p>
                <p className="text-sm font-medium text-gray-900">{negocio?.nombre || 'Mi Negocio'}</p>
                {negocio?.nif && <p className="text-xs text-gray-400">{negocio.nif}</p>}
                {negocio?.email && <p className="text-xs text-gray-400">{negocio.email}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Para</p>
                <p className="text-sm font-medium text-gray-900">{doc.cliente?.nombre}</p>
              </div>
            </div>
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-2 text-xs text-gray-400 uppercase tracking-widest">Descripción</th>
                  <th className="text-right pb-2 text-xs text-gray-400 uppercase tracking-widest">Cant.</th>
                  <th className="text-right pb-2 text-xs text-gray-400 uppercase tracking-widest">Precio</th>
                  <th className="text-right pb-2 text-xs text-gray-400 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody>
                {doc.lineas.map((l, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 text-sm text-gray-800">{l.description}</td>
                    <td className="py-3 text-sm text-right text-gray-600">{l.quantity}</td>
                    <td className="py-3 text-sm text-right text-gray-600">{formatearEuros(l.unit_price)}</td>
                    <td className="py-3 text-sm text-right font-medium text-gray-900">{formatearEuros(l.quantity * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-sm text-gray-400"><span>Base</span><span>{formatearEuros(doc.totales.subtotal)}</span></div>
                <div className="flex justify-between text-sm text-gray-400"><span>IVA</span><span>{formatearEuros(doc.totales.totalIva)}</span></div>
                <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>{formatearEuros(doc.totales.total)}</span></div>
              </div>
            </div>
            {doc.notas && <p className="mt-8 text-xs text-gray-400">{doc.notas}</p>}
          </div>
        )}

        {plantillaPDF === 'moderna' && (
          <div className="bg-white">
            <div className="bg-gray-900 p-8 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xl font-bold">{negocio?.nombre || 'Mi Negocio'}</p>
                  {negocio?.nif && <p className="text-gray-400 text-sm">{negocio.nif}</p>}
                  {negocio?.email && <p className="text-gray-400 text-sm">{negocio.email}</p>}
                </div>
                <div className="text-right">
                  <p className="text-brand text-3xl font-bold">{tipoLabel.toUpperCase()}</p>
                  <p className="text-gray-400">{doc.numero}</p>
                  <p className="text-gray-400 text-sm">{formatearFecha(doc.fecha)}</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
                <p className="font-bold text-gray-900">{doc.cliente?.nombre}</p>
              </div>
              <table className="w-full mb-6">
                <thead>
                  <tr style={{ backgroundColor: '#FF5C39' }} className="text-white">
                    <th className="text-left p-3 text-xs">Descripción</th>
                    <th className="text-right p-3 text-xs">Cant.</th>
                    <th className="text-right p-3 text-xs">Precio</th>
                    <th className="text-right p-3 text-xs">IVA</th>
                    <th className="text-right p-3 text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lineas.map((l, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                <div className="w-52 bg-gray-900 text-white rounded-xl p-4 space-y-1">
                  <div className="flex justify-between text-sm text-gray-400"><span>Base</span><span>{formatearEuros(doc.totales.subtotal)}</span></div>
                  <div className="flex justify-between text-sm text-gray-400"><span>IVA</span><span>{formatearEuros(doc.totales.totalIva)}</span></div>
                  <div className="flex justify-between font-bold text-brand pt-1 border-t border-gray-700"><span>Total</span><span>{formatearEuros(doc.totales.total)}</span></div>
                </div>
              </div>
              {doc.notas && <p className="mt-6 text-sm text-gray-500">{doc.notas}</p>}
            </div>
          </div>
        )}

        {plantillaPDF === 'editorial' && (
          <div className="bg-white p-8">
            <div className="border-l-4 border-brand pl-6 mb-8">
              <p className="text-xs text-gray-400 uppercase tracking-widest">{tipoLabel}</p>
              <p className="text-5xl font-black text-gray-900">{doc.numero}</p>
              <p className="text-sm text-gray-400">{formatearFecha(doc.fecha)}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Emisor</p>
                <p className="font-bold text-gray-900">{negocio?.nombre || 'Mi Negocio'}</p>
                {negocio?.nif && <p className="text-sm text-gray-500">{negocio.nif}</p>}
                {negocio?.direccion && <p className="text-sm text-gray-500">{negocio.direccion}</p>}
                {negocio?.telefono && <p className="text-sm text-gray-500">{negocio.telefono}</p>}
                {negocio?.email && <p className="text-sm text-gray-500">{negocio.email}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Cliente</p>
                <p className="font-bold text-gray-900">{doc.cliente?.nombre}</p>
              </div>
            </div>
            <table className="w-full mb-6">
              <thead>
                <tr className="border-t-2 border-b-2 border-gray-900">
                  <th className="text-left py-2 text-xs uppercase tracking-widest">Descripción</th>
                  <th className="text-right py-2 text-xs uppercase tracking-widest">Cant.</th>
                  <th className="text-right py-2 text-xs uppercase tracking-widest">Precio</th>
                  <th className="text-right py-2 text-xs uppercase tracking-widest">IVA</th>
                  <th className="text-right py-2 text-xs uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody>
                {doc.lineas.map((l, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 text-sm">{l.description}</td>
                    <td className="py-3 text-sm text-right font-mono">{l.quantity}</td>
                    <td className="py-3 text-sm text-right font-mono">{formatearEuros(l.unit_price)}</td>
                    <td className="py-3 text-sm text-right">{l.vat_rate}%</td>
                    <td className="py-3 text-sm text-right font-mono font-medium">{formatearEuros(l.quantity * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-sm text-gray-500"><span>Base</span><span className="font-mono">{formatearEuros(doc.totales.subtotal)}</span></div>
                <div className="flex justify-between text-sm text-gray-500"><span>IVA</span><span className="font-mono">{formatearEuros(doc.totales.totalIva)}</span></div>
                <div className="flex justify-between font-black text-gray-900 pt-1 border-t-2 border-gray-900"><span>Total</span><span className="font-mono text-brand">{formatearEuros(doc.totales.total)}</span></div>
              </div>
            </div>
            {doc.notas && <p className="mt-6 text-sm text-gray-500 border-t border-gray-100 pt-4">{doc.notas}</p>}
          </div>
        )}
      </div>
    </div>
  )
}