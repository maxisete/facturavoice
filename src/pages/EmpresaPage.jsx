import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
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

  const handleCampo = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }))

  const handleGuardar = async () => {
    setNegocio({ ...negocio, ...form })
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('negocios').upsert({ id: user.id, ...negocio, ...form })
      await registrarAccion('cambiar_empresa', { nombre: form.nombre, email: form.email })
    }
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