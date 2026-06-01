import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAppStore } from './store/appStore'
import HomePage from './pages/HomePage'
import DictatePage from './pages/DictatePage'
import DocumentPage from './pages/DocumentPage'
import AjustesPage from './pages/AjustesPage'
import ClientesPage from './pages/ClientesPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const { darkMode } = useAppStore()
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/" element={session ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/dictar" element={session ? <DictatePage /> : <Navigate to="/login" />} />
        <Route path="/documento" element={session ? <DocumentPage /> : <Navigate to="/login" />} />
        <Route path="/ajustes" element={session ? <AjustesPage /> : <Navigate to="/login" />} />
        <Route path="/clientes" element={session ? <ClientesPage /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}