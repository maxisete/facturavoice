import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { LogOut } from 'lucide-react'

export default function AjustesPage() {
  const navigate = useNavigate()
  const { negocio, setNegocio, setContadores, plantillaPDF, setPlantillaPDF } = useAppStore()
  const [form, setForm] = useState({
    nombre: negocio?.nombre || '',
    nif: negocio?.nif || '',
    direccion: negocio?.direccion || '',
    ciudad: negocio?.ciudad || '',
    telefono: negocio?.telefono || '',
    email: negocio?.email || '',
    nombre_usuario: negocio?.nombre_usuario || '',
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
    if (user) {
      await supabase.from('negocios').upsert({
        id: user.id,
        ...form,
      })
    }

    navigate(-1)
  }

  const handleCampo = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-bold text-gray-900 flex-1">Ajustes</h1>
        <button
          onClick={handleGuardar}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Save size={15} />
          Guardar
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut() }}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="px-5 py-5 space-y-4 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs text-gray-400 uppercase tracking-wide">Tu negocio</p>

          {[
            { campo: 'nombre_usuario', label: 'Tu nombre', tipo: 'text', placeholder: 'Maxi, Emilio, Juan Luis…' },
            { campo: 'nombre', label: 'Nombre o razón social', tipo: 'text', placeholder: 'Pinturas García S.L.' },
            { campo: 'nif', label: 'NIF / CIF', tipo: 'text', placeholder: 'B12345678' },
            { campo: 'direccion', label: 'Dirección', tipo: 'text', placeholder: 'Calle Mayor 1' },
            { campo: 'ciudad', label: 'Ciudad', tipo: 'text', placeholder: 'Madrid' },
            { campo: 'telefono', label: 'Teléfono', tipo: 'tel', placeholder: '600 000 000' },
            { campo: 'email', label: 'Email', tipo: 'email', placeholder: 'info@minegocio.es' },
          ].map(({ campo, label, tipo, placeholder }) => (
            <div key={campo} className="px-4 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <input
                type={tipo}
                value={form[campo]}
                onChange={e => handleCampo(campo, e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm text-gray-900 bg-transparent focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs text-gray-400 uppercase tracking-wide">Preferencias</p>

          <div className="px-4 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-1">IVA por defecto (%)</p>
            <input
              type="number"
              value={form.iva_defecto}
              onChange={e => handleCampo('iva_defecto', parseFloat(e.target.value) || 21)}
              className="w-full text-sm text-gray-900 bg-transparent focus:outline-none"
            />
          </div>
          <div className="px-4 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-1">Próximo nº de presupuesto</p>
            <input
              type="number"
              value={form.contador_presupuesto}
              onChange={e => handleCampo('contador_presupuesto', parseInt(e.target.value) || 1)}
              className="w-full text-sm text-gray-900 bg-transparent focus:outline-none"
            />
          </div>
          <div className="px-4 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-1">Próximo nº de factura</p>
            <input
              type="number"
              value={form.contador_factura}
              onChange={e => handleCampo('contador_factura', parseInt(e.target.value) || 1)}
              className="w-full text-sm text-gray-900 bg-transparent focus:outline-none"
            />
          </div>
          <div className="px-4 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-1">Próximo nº de albarán</p>
            <input
              type="number"
              value={form.contador_albaran}
              onChange={e => handleCampo('contador_albaran', parseInt(e.target.value) || 1)}
              className="w-full text-sm text-gray-900 bg-transparent focus:outline-none"
            />
          </div>

          <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Color de marca</p>
              <p className="text-sm text-gray-900">{form.color_marca}</p>
            </div>
            <input
              type="color"
              value={form.color_marca}
              onChange={e => handleCampo('color_marca', e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer border-0"
            />
          </div>
          <div className="px-4 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-2">Plantilla de PDF</p>
            <div className="grid grid-cols-2 gap-2">
              {['clasica', 'minimal', 'moderna', 'editorial'].map(p => (
                <button
                  key={p}
                  onClick={() => setPlantillaPDF(p)}
                  className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    plantillaPDF === p
                      ? 'border-brand bg-orange-50 text-brand'
                      : 'border-gray-200 text-gray-500'
                  }`}
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