import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const handleSubmit = async () => {
    setError(null)
    setMensaje(null)
    setCargando(true)

    try {
      if (modo === 'registro') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMensaje('Cuenta creada. Revisa tu email para confirmarla.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-900">FacturaVoice</h1>
          <p className="text-gray-400 mt-1">De la voz al PDF en segundos</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-2">
            <button
              onClick={() => setModo('login')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                modo === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setModo('registro')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                modo === 'registro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Email</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full text-sm text-gray-900 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Contraseña</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm text-gray-900 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          {mensaje && (
            <p className="text-sm text-green-600 bg-green-50 rounded-xl px-4 py-3">{mensaje}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={cargando || !email || !password}
            className="w-full bg-gray-900 text-white py-3 rounded-2xl font-medium hover:bg-brand transition-colors disabled:opacity-50"
          >
            {cargando ? 'Cargando…' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}