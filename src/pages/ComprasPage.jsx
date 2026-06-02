import { useState, useEffect } from 'react'
import { Upload, Camera, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ComprasPage() {
  const [facturas, setFacturas] = useState([])
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    cargarFacturas()
  }, [])

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

      const { error: errorSubida } = await supabase.storage
        .from('facturas-proveedor')
        .upload(ruta, archivo)

      if (errorSubida) throw errorSubida

      const { data: { publicUrl } } = supabase.storage
        .from('facturas-proveedor')
        .getPublicUrl(ruta)

      // Extraer datos con IA (Groq)
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

  const leerArchivoComoBase64 = (archivo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(archivo)
    })
  }

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
    let textoFactura = ''
    if (esImagen) {
      textoFactura = '[imagen adjunta]'
    } else {
      textoFactura = await extraerTextoPDF(archivo)
    }
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Analiza este texto de una factura de proveedor y extrae los datos.

Devuelve SOLO un JSON válido con esta estructura exacta, sin texto adicional, sin markdown:
{
  "nombre_proveedor": "nombre de la empresa proveedora",
  "numero_factura": "número de factura",
  "fecha_factura": "fecha en formato DD/MM/YYYY",
  "total": 123.45,
  "lineas": [
    {
      "referencia": "REF-001",
      "descripcion": "Descripción del producto",
      "cantidad": 1,
      "precio_neto": 10.00,
      "pvp": 15.00,
      "iva": 21
    }
  ]
}

Texto de la factura:
${textoFactura.substring(0, 4000)}`
        }],
        temperature: 0.1,
      })
    })
    const data = await response.json()
    const texto = data.choices[0].message.content.trim()
    const clean = texto.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-5 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Compras</h1>
      <p className="text-gray-500 mb-6">Facturas de tus proveedores</p>

      {/* Botones de subida */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <label className="flex flex-col items-center gap-2 bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-brand transition-colors">
          <Upload size={24} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Subir PDF</span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => handleArchivo(e.target.files[0])}
          />
        </label>

        <label className="flex flex-col items-center gap-2 bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-brand transition-colors">
          <Camera size={24} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Hacer foto</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handleArchivo(e.target.files[0])}
          />
        </label>
      </div>

      {/* Estado de subida */}
      {subiendo && (
        <div className="bg-orange-50 border border-brand rounded-2xl p-4 mb-6 text-center">
          <p className="text-brand font-medium text-sm">Analizando factura con IA…</p>
          <p className="text-xs text-gray-500 mt-1">Esto puede tardar unos segundos</p>
        </div>
      )}

      {/* Lista de facturas */}
      {facturas.length === 0 && !subiendo && (
        <div className="text-center py-12">
          <FileText size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aún no tienes facturas de proveedores</p>
        </div>
      )}

      <div className="space-y-3">
        {facturas.map(f => (
          <div key={f.id} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{f.nombre_proveedor}</p>
                <p className="text-xs text-gray-400">{f.numero_factura} · {f.fecha_factura}</p>
              </div>
              <p className="font-mono font-medium text-brand">{f.total?.toFixed(2)} €</p>
            </div>
            {f.lineas?.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">{f.lineas.length} artículo{f.lineas.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}