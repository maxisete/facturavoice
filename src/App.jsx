import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { useAppStore } from './store/appStore'
import HomePage from './pages/HomePage'
import DictatePage from './pages/DictatePage'
import DocumentPage from './pages/DocumentPage'
import AjustesPage from './pages/AjustesPage'
import ClientesPage from './pages/ClientesPage'
import EmpresaPage from './pages/EmpresaPage'
import LoginPage from './pages/LoginPage'
import ComprasPage from './pages/ComprasPage'
import DocumentosPage from './pages/DocumentosPage'
import FacturaProveedorPage from './pages/FacturaProveedorPage'
import NavBar from './components/NavBar'
import PrivacidadPage from './pages/PrivacidadPage'

const CON_NAVBAR = ['/', '/documentos', '/compras', '/clientes', '/ajustes']

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
  const [mfaRequerido, setMfaRequerido] = useState(false)
  const ignorar = useRef(false)
  const { setNegocio, setClientes } = useAppStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const procesarSesion = async (session) => {
    if (!session) {
      setMfaRequerido(false)
      setSession(null)
      return
    }
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
      // Sesión aal1 viva pero pendiente de 2FA: NO la tratamos como válida,
      // pero tampoco cerramos sesión (verify la necesita)
      setMfaRequerido(true)
      setSession(null)
      return
    }
    setMfaRequerido(false)
    setSession(session)
    cargarDatos(session.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      procesarSesion(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      procesarSesion(session)
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

  if (session === undefined && !mfaRequerido) return null

  return (
    <BrowserRouter>
      <Layout session={session}>
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage mfaRequerido={mfaRequerido} />} />
          <Route path="/" element={session ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/dictar" element={session ? <DictatePage /> : <Navigate to="/login" />} />
          <Route path="/documento" element={session ? <DocumentPage /> : <Navigate to="/login" />} />
          <Route path="/ajustes" element={session ? <AjustesPage /> : <Navigate to="/login" />} />
          <Route path="/empresa" element={session ? <EmpresaPage /> : <Navigate to="/login" />} />
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