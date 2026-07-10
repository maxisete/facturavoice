import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ShoppingCart, ShoppingBag, Users, Settings } from 'lucide-react'

const TABS = [
  { path: '/', label: 'Inicio', icono: Home },
  { path: '/documentos', label: 'Ventas', icono: ShoppingCart },
  { path: '/compras', label: 'Compras', icono: ShoppingBag },
  { path: '/clientes', label: 'Clientes', icono: Users },
  { path: '/ajustes', label: 'Ajustes', icono: Settings },
]

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background: 'color-mix(in srgb, var(--color-void) 95%, transparent)',
        borderTop: '1px solid color-mix(in srgb, var(--color-cyan) 20%, transparent)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 20px color-mix(in srgb, var(--color-cyan) 5%, transparent)',
      }}
    >
      {TABS.map(({ path, label, icono: Icono }) => {
        const activo = location.pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200"
          >
            <Icono
              size={20}
              className={activo ? 'text-neon-cyan' : 'text-gray-600'}
              style={activo ? { filter: 'drop-shadow(0 0 6px #00f5ff)' } : {}}
            />
            <span
              className={`text-[10px] font-mono ${activo ? 'text-neon-cyan' : 'text-gray-600'}`}
              style={activo ? { textShadow: '0 0 8px #00f5ff' } : {}}
            >
              {label}
            </span>
            {activo && (
              <div
                className="absolute bottom-0 w-8 h-0.5 rounded-full"
                style={{ background: '#00f5ff', boxShadow: '0 0 8px #00f5ff' }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}