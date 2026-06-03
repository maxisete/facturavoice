import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAppStore } from './store/appStore'
import HomePage from './pages/HomePage'
import DictatePage from './pages/DictatePage'
import DocumentPage from './pages/DocumentPage'
import AjustesPage from './pages/AjustesPage'
import ClientesPage from './pages/ClientesPage'
import LoginPage from './pages/LoginPage'
import ComprasPage from './pages/ComprasPage'
import DocumentosPage from './pages/DocumentosPage'
import FacturaProveedorPage from './pages/FacturaProveedorPage'
import NavBar from './components/NavBar'
import PrivacidadPage from './pages/PrivacidadPage'

const CON_NAVBAR = ['/', '/documentos', '/compras', '/ajustes']

function Layout({ session, children }) {
  const location = useLocation()
  const mostrarNav = session && CON_NAVBAR.includes(location.pathname)
  return (
    <>
      <div className={mostrarNav ? 'pb-16' : ''}>
        {children}
      </div>
      {mostrarNav && <NavBar />}
    </>
  )
}

export default function App() {
  const { darkMode } = useAppStore()
  const [session, setSession] = useState(undefined)
  const { setNegocio, setClientes } = useAppStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarDatos(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) cargarDatos(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  const cargarDatos = async (userId) => {
    const { data: negocio } = await supabase.from('negocios').select('*').eq('id', userId).single()
    if (negocio) setNegocio(negocio)
    else setNegocio(null)

    const { data: clientes } = await supabase.from('clientes').select('*').eq('user_id', userId)
    if (clientes) setClientes(clientes)
    else setClientes([])
  }

  if (session === undefined) return null

  return (
    <BrowserRouter>
      <Layout session={session}>
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={session ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/dictar" element={session ? <DictatePage /> : <Navigate to="/login" />} />
          <Route path="/documento" element={session ? <DocumentPage /> : <Navigate to="/login" />} />
          <Route path="/ajustes" element={session ? <AjustesPage /> : <Navigate to="/login" />} />
          <Route path="/clientes" element={session ? <ClientesPage /> : <Navigate to="/login" />} />
          <Route path="/documentos" element={session ? <DocumentosPage /> : <Navigate to="/login" />} />
          <Route path="/compras" element={session ? <ComprasPage /> : <Navigate to="/login" />} />
          <Route path="/factura-proveedor" element={session ? <FacturaProveedorPage /> : <Navigate to="/login" />} />
          <Route path="/privacidad" element={<PrivacidadPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}