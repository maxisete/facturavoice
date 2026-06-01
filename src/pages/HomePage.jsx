import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, Truck, Plus } from 'lucide-react'

const TIPOS = [
  { id: 'presupuesto', label: 'Presupuesto', icono: FileText },
  { id: 'factura', label: 'Factura', icono: Receipt },
  { id: 'albaran', label: 'Albarán', icono: Truck },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState('presupuesto')

  return (
    <div className="min-h-screen bg-gray-50 px-5 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Hola 👋</h1>
      <p className="text-gray-500 mb-8">¿Qué necesitas hoy?</p>

      {/* Selector de tipo */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {TIPOS.map(({ id, label, icono: Icono }) => (
          <button
            key={id}
            onClick={() => setTipo(id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              tipo === id
                ? 'border-brand bg-orange-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <Icono
              size={22}
              className={tipo === id ? 'text-brand' : 'text-gray-400'}
            />
            <span className={`text-xs font-medium ${tipo === id ? 'text-brand' : 'text-gray-500'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Botón nuevo documento */}
      <button
        onClick={() => navigate('/dictar', { state: { tipo } })}
        className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-brand transition-colors"
      >
        <Plus size={22} />
        Nuevo {tipo}
      </button>
    </div>
  )
}