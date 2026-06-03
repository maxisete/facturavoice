import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Camera, FileText, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatearEuros } from '../lib/document'

export default function ComprasPage() {
  const [facturas, setFacturas] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { cargarFacturas() }, [])

  const cargarFacturas = async () => {
    const { data, error } = await supabase
      .from('facturas_proveedor')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setFacturas(data)
  }

  const handleArchivo = async (archivo) => {
    if (!archivo) return
    setSubiendo(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const extension = archivo.name.split('.').pop()
      const ruta = `${user.id}/${Date.now()}.${extension}`
      const { error: errorSubida } = await supabase.storage.from('facturas-proveedor').upload(ruta, archivo)
      if (errorSubida) throw errorSubida
      const { data: { publicUrl } } = supabase.storage.from('facturas-proveedor').getPublicUrl(ruta)
      const textoArchivo = await leerArchivoComoBase64(archivo)
      const datosExtraidos = await extraerConIA(textoArchivo, archivo.type, archivo)
      await supabase.from('facturas_proveedor').insert({
        user_id: user.id,
        nombre_proveedor: datosExtraidos.nombre_proveedor || 'Desconocido',
        numero_factura: datosExtraidos.numero_factura || '',
        fecha_factura: datosExtraidos.fecha_factura || '',
        lineas: datosExtraidos.lineas || [],
        total: datosExtraidos.total || 0,
        archivo_url: publicUrl,
      })
      await cargarFacturas()
    } catch (err) {
      console.error('Error subiendo factura:', err)
    } finally {
      setSubiendo(false)
    }
  }

  const leerArchivoComoBase64 = (archivo) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(archivo)
  })

  const extraerTextoPDF = async (archivo) => {
    const arrayBuffer = await archivo.arrayBuffer()
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let texto = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      texto += content.items.map(item => item.str).join(' ') + '\n'
    }
    return texto
  }

  const extraerConIA = async (base64, tipo, archivo) => {
    const esImagen = tipo.startsWith('image/')
    let textoFactura = esImagen ? '[imagen adjunta]' : await extraerTextoPDF(archivo)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `Analiza este texto de una factura de proveedor y extrae los datos. Devuelve SOLO un JSON válido con esta estructura exacta, sin texto adicional, sin markdown:\n{\n  "nombre_proveedor": "nombre de la empresa proveedora",\n  "numero_factura": "número de factura",\n  "fecha_factura": "fecha en formato DD/MM/YYYY",\n  "total": 123.45,\n  "lineas": [\n    {\n      "referencia": "REF-001",\n      "descripcion": "Descripción del producto",\n      "cantidad": 1,\n      "precio_neto": 10.00,\n      "pvp": 15.00,\n      "iva": 21\n    }\n  ]\n}\n\nTexto de la factura:\n${textoFactura.substring(0, 4000)}` }],
        temperature: 0.1,
      })
    })
    const data = await response.json()
    const texto = data.choices[0].message.content.trim()
    return JSON.parse(texto.replace(/```json|```/g, '').trim())
  }

  return (
    <div className="min-h-screen bg-void px-5 pt-12 pb-8">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-orbitron text-neon-cyan tracking-widest uppercase mb-1 flicker">
          COMPRAS // FACTURAS PROVEEDOR
        </p>
        <h1 className="text-2xl font-orbitron font-bold text-white neon-cyan">COMPRAS</h1>
        <p className="text-gray-500 text-sm mt-1 font-mono">Facturas de tus proveedores</p>
      </div>

      {/* Botones de subida */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <label className="flex flex-col items-center gap-2 card-dark rounded-xl p-5 cursor-pointer transition-all"
          style={{ border: '1px dashed rgba(0,245,255,0.3)' }}
        >
          <Upload size={24} className="text-neon-cyan" style={{ filter: 'drop-shadow(0 0 6px #00f5ff)' }} />
          <span className="text-sm font-mono text-gray-400">Subir PDF</span>
          <input type="file" accept=".pdf" className="hidden" onChange={e => handleArchivo(e.target.files[0])} />
        </label>

        <label className="flex flex-col items-center gap-2 card-dark rounded-xl p-5 cursor-pointer transition-all"
          style={{ border: '1px dashed rgba(0,245,255,0.3)' }}
        >
          <Camera size={24} className="text-neon-cyan" style={{ filter: 'drop-shadow(0 0 6px #00f5ff)' }} />
          <span className="text-sm font-mono text-gray-400">Hacer foto</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleArchivo(e.target.files[0])} />
        </label>
      </div>

      {/* Estado de subida */}
      {subiendo && (
        <div className="rounded-xl p-4 mb-6 text-center scanline"
          style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.3)' }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap size={14} className="text-neon-cyan" />
            <p className="text-neon-cyan font-orbitron text-xs tracking-widest">ANALIZANDO CON IA...</p>
          </div>
          <p className="text-xs text-gray-600 font-mono">Esto puede tardar unos segundos</p>
        </div>
      )}

      {/* Lista vacía */}
      {facturas.length === 0 && !subiendo && (
        <div className="text-center py-12">
          <FileText size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-600 text-sm font-mono">Sin facturas de proveedores</p>
        </div>
      )}

      {/* Lista de facturas */}
      <div className="space-y-3">
        {facturas.map(f => (
          <div
            key={f.id}
            onClick={() => navigate('/factura-proveedor', { state: { factura: f } })}
            className="card-dark rounded-xl p-4 cursor-pointer scanline"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono font-medium text-white">{f.nombre_proveedor}</p>
                <p className="text-xs text-gray-600 mt-0.5">{f.numero_factura} · {f.fecha_factura}</p>
              </div>
              <p className="font-orbitron font-bold text-neon-orange">{formatearEuros(f.total)}</p>
            </div>
            {f.lineas?.length > 0 && (
              <p className="text-xs text-gray-600 mt-2 font-mono">
                {f.lineas.length} artículo{f.lineas.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}