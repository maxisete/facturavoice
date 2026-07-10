import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, Upload, Image as ImageIcon } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { registrarAccion } from '../lib/auditoria'

const CAMPOS = [
  { campo: 'nombre_usuario', label: 'Tu nombre', tipo: 'text', placeholder: 'Maxi, Emilio, Juan Luis…' },
  { campo: 'nombre', label: 'Nombre o razón social', tipo: 'text', placeholder: 'Pinturas García S.L.' },
  { campo: 'nif', label: 'NIF / CIF', tipo: 'text', placeholder: 'B12345678' },
  { campo: 'direccion', label: 'Dirección', tipo: 'text', placeholder: 'Calle Mayor 1' },
  { campo: 'ciudad', label: 'Ciudad', tipo: 'text', placeholder: 'Madrid' },
  { campo: 'telefono', label: 'Teléfono', tipo: 'tel', placeholder: '600 000 000' },
  { campo: 'email', label: 'Email', tipo: 'email', placeholder: 'info@minegocio.es' },
]

export default function EmpresaPage() {
  const navigate = useNavigate()
  const { negocio, setNegocio } = useAppStore()
  const [form, setForm] = useState({
    nombre_usuario: negocio?.nombre_usuario || '',
    nombre: negocio?.nombre || '',
    nif: negocio?.nif || '',
    direccion: negocio?.direccion || '',
    ciudad: negocio?.ciudad || '',
    telefono: negocio?.telefono || '',
    email: negocio?.email || '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(negocio?.logo_url || null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)

  const handleCampo = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }))
  const handleSeleccionarLogo = (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return

    const tiposValidos = ['image/png', 'image/jpeg', 'image/webp']
    if (!tiposValidos.includes(archivo.type)) {
      alert('Solo se permiten imágenes PNG, JPEG o WEBP.')
      return
    }

    const maxTamano = 5 * 1024 * 1024 // 5 MB
    if (archivo.size > maxTamano) {
      alert('La imagen no puede superar los 5 MB.')
      return
    }

    setLogoFile(archivo)
    setLogoPreview(URL.createObjectURL(archivo))
  }
  const subirLogo = async (userId) => {
    if (!logoFile) return negocio?.logo_url || null

    setSubiendoLogo(true)
    try {
      const extension = logoFile.name.split('.').pop()
      const ruta = `${userId}/logo.${extension}`

      const { error: errorSubida } = await supabase.storage
        .from('logos')
        .upload(ruta, logoFile, { upsert: true })

      if (errorSubida) throw errorSubida

      const { data } = supabase.storage.from('logos').getPublicUrl(ruta)
      return data.publicUrl
    } catch (error) {
      alert('Error al subir el logo: ' + error.message)
      return negocio?.logo_url || null
    } finally {
      setSubiendoLogo(false)
    }
  }

  const handleGuardar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate(-1)
      return
    }

    const logoUrl = await subirLogo(user.id)
    const datosActualizados = { ...form, logo_url: logoUrl }

    setNegocio({ ...negocio, ...datosActualizados })
    await supabase.from('negocios').upsert({ id: user.id, ...negocio, ...datosActualizados })
    await registrarAccion('cambiar_empresa', { nombre: form.nombre, email: form.email })
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-void">
      <header className="px-5 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(0,245,255,0.15)', background: 'rgba(10,10,15,0.98)' }}
      >
        <button onClick={() => navigate(-1)} className="text-neon-cyan">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-orbitron font-bold text-white flex-1 neon-cyan">EMPRESA</h1>
        <button
          onClick={handleGuardar}
          className="flex items-center gap-2 btn-neon-solid text-white px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest"
        >
          <Save size={14} />
          GUARDAR
        </button>
      </header>

      <div className="px-5 py-5 space-y-4 max-w-lg mx-auto">
        <div className="card-dark rounded-xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-orbitron text-neon-cyan/50 tracking-widest">
            // LOGO DE TU EMPRESA
          </p>
          <div className="px-4 pb-4 flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ border: '1px solid rgba(0,245,255,0.15)', background: 'rgba(255,255,255,0.03)' }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo de la empresa" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon size={28} className="text-gray-600" />
              )}
            </div>
            <label
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest cursor-pointer text-neon-cyan"
              style={{ border: '1px solid rgba(0,245,255,0.3)' }}
            >
              <Upload size={14} />
              {subiendoLogo ? 'SUBIENDO...' : logoPreview ? 'CAMBIAR' : 'SUBIR LOGO'}
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleSeleccionarLogo}
                disabled={subiendoLogo}
                className="hidden"
              />
            </label>
          </div>
        </div>
        <div className="card-dark rounded-xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-orbitron text-neon-cyan/50 tracking-widest">
            // DATOS DE TU EMPRESA
          </p>
          {CAMPOS.map(({ campo, label, tipo, placeholder }) => (
            <div key={campo} className="px-4 py-3" style={{ borderTop: '1px solid rgba(0,245,255,0.07)' }}>
              <p className="text-xs font-mono text-gray-600 mb-1">{label}</p>
              <input
                type={tipo}
                value={form[campo]}
                onChange={e => handleCampo(campo, e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm text-white bg-transparent focus:outline-none font-mono placeholder-gray-700"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}