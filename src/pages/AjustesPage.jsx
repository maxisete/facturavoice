import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, LogOut } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'

export default function AjustesPage() {
  const navigate = useNavigate()
  const { negocio, setNegocio, setContadores, plantillaPDF, setPlantillaPDF } = useAppStore()
  const [form, setForm] = useState({
    nombre_usuario: negocio?.nombre_usuario || '',
    nombre: negocio?.nombre || '',
    nif: negocio?.nif || '',
    direccion: negocio?.direccion || '',
    ciudad: negocio?.ciudad || '',
    telefono: negocio?.telefono || '',
    email: negocio?.email || '',
    iva_defecto: negocio?.iva_defecto || 21,
    color_marca: negocio?.color_marca || '#FF5C39',
    contador_presupuesto: negocio?.contador_presupuesto || 1,
    contador_factura: negocio?.contador_factura || 1,
    contador_albaran: negocio?.contador_albaran || 1,
  })

  const handleGuardar = async () => {
    const año = new Date().getFullYear()
    setNegocio(form)
    setContadores({
      [`P-${año}`]: form.contador_presupuesto - 1,
      [`F-${año}`]: form.contador_factura - 1,
      [`A-${año}`]: form.contador_albaran - 1,
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('negocios').upsert({ id: user.id, ...form })
    navigate(-1)
  }

  const handleCampo = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }))

  const camposNegocio = [
    { campo: 'nombre_usuario', label: 'Tu nombre', tipo: 'text', placeholder: 'Maxi, Emilio, Juan Luis…' },
    { campo: 'nombre', label: 'Nombre o razón social', tipo: 'text', placeholder: 'Pinturas García S.L.' },
    { campo: 'nif', label: 'NIF / CIF', tipo: 'text', placeholder: 'B12345678' },
    { campo: 'direccion', label: 'Dirección', tipo: 'text', placeholder: 'Calle Mayor 1' },
    { campo: 'ciudad', label: 'Ciudad', tipo: 'text', placeholder: 'Madrid' },
    { campo: 'telefono', label: 'Teléfono', tipo: 'tel', placeholder: '600 000 000' },
    { campo: 'email', label: 'Email', tipo: 'email', placeholder: 'info@minegocio.es' },
  ]

  return (
    <div className="min-h-screen bg-void">
      <header className="px-5 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(0,245,255,0.15)', background: 'rgba(10,10,15,0.98)' }}
      >
        <button onClick={() => navigate(-1)} className="text-neon-cyan">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-orbitron font-bold text-white flex-1 neon-cyan">AJUSTES</h1>
        <button
          onClick={handleGuardar}
          className="flex items-center gap-2 btn-neon-solid text-white px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest"
        >
          <Save size={14} />
          GUARDAR
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut() }}
          className="p-2 text-gray-600 hover:text-neon-pink transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="px-5 py-5 space-y-4 max-w-lg mx-auto">

        {/* Sección negocio */}
        <div className="card-dark rounded-xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-orbitron text-neon-cyan/50 tracking-widest">
            // TU NEGOCIO
          </p>
          {camposNegocio.map(({ campo, label, tipo, placeholder }) => (
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

        {/* Sección preferencias */}
        <div className="card-dark rounded-xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-orbitron text-neon-cyan/50 tracking-widest">
            // PREFERENCIAS
          </p>

          {[
            { campo: 'iva_defecto', label: 'IVA por defecto (%)', tipo: 'number', parser: v => parseFloat(v) || 21 },
            { campo: 'contador_presupuesto', label: 'Próximo nº de presupuesto', tipo: 'number', parser: v => parseInt(v) || 1 },
            { campo: 'contador_factura', label: 'Próximo nº de factura', tipo: 'number', parser: v => parseInt(v) || 1 },
            { campo: 'contador_albaran', label: 'Próximo nº de albarán', tipo: 'number', parser: v => parseInt(v) || 1 },
          ].map(({ campo, label, tipo, parser }) => (
            <div key={campo} className="px-4 py-3" style={{ borderTop: '1px solid rgba(0,245,255,0.07)' }}>
              <p className="text-xs font-mono text-gray-600 mb-1">{label}</p>
              <input
                type={tipo}
                value={form[campo]}
                onChange={e => handleCampo(campo, parser(e.target.value))}
                className="w-full text-sm text-white bg-transparent focus:outline-none font-mono"
              />
            </div>
          ))}

          <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(0,245,255,0.07)' }}>
            <div>
              <p className="text-xs font-mono text-gray-600 mb-1">Color de marca</p>
              <p className="text-sm font-mono text-neon-orange">{form.color_marca}</p>
            </div>
            <input
              type="color"
              value={form.color_marca}
              onChange={e => handleCampo('color_marca', e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
            />
          </div>

          <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(0,245,255,0.07)' }}>
            <p className="text-xs font-mono text-gray-600 mb-3">Plantilla de PDF</p>
            <div className="grid grid-cols-2 gap-2">
              {['clasica', 'minimal', 'moderna', 'editorial'].map(p => (
                <button
                  key={p}
                  onClick={() => setPlantillaPDF(p)}
                  className={`py-2 rounded-xl font-mono text-sm transition-all ${
                    plantillaPDF === p
                      ? 'text-neon-cyan border border-neon-cyan/50 bg-neon-cyan/10'
                      : 'text-gray-600 border border-white/10 hover:border-neon-cyan/30'
                  }`}
                  style={plantillaPDF === p ? { boxShadow: '0 0 10px rgba(0,245,255,0.15)' } : {}}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}