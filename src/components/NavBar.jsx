import { useNavigate, useLocation } from 'react-router-dom'
import { Home, FileText, ShoppingBag, Settings } from 'lucide-react'

const TABS = [
  { path: '/', label: 'Inicio', icono: Home },
  { path: '/documentos', label: 'Documentos', icono: FileText },
  { path: '/compras', label: 'Compras', icono: ShoppingBag },
  { path: '/ajustes', label: 'Ajustes', icono: Settings },
]

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
      {TABS.map(({ path, label, icono: Icono }) => {
        const activo = location.pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center gap-1 py-3"
          >
            <Icono size={22} className={activo ? 'text-brand' : 'text-gray-400'} />
            <span className={`text-xs font-medium ${activo ? 'text-brand' : 'text-gray-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}