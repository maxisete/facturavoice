import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Zap } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login')
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
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-5"
      style={{
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap size={28} className="text-neon-orange" style={{ filter: 'drop-shadow(0 0 8px #FF5C39)' }} />
            <h1 className="font-orbitron text-3xl font-bold text-white neon-cyan">
              FACTURA<span className="text-neon-orange neon-orange">VOICE</span>
            </h1>
          </div>
          <p className="text-gray-600 font-mono text-sm">// De la voz al PDF en segundos</p>
        </div>

        {/* Card */}
        <div className="card-dark rounded-2xl p-6 space-y-4">

          {/* Toggle */}
          <div className="flex rounded-xl p-1 gap-1"
            style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.1)' }}
          >
            {['login', 'registro'].map(m => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`flex-1 py-2 rounded-lg font-mono text-sm transition-all ${
                  modo === m
                    ? 'text-neon-cyan'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
                style={modo === m ? {
                  background: 'rgba(0,245,255,0.1)',
                  boxShadow: '0 0 10px rgba(0,245,255,0.15)'
                } : {}}
              >
                {m === 'login' ? 'ENTRAR' : 'REGISTRO'}
              </button>
            ))}
          </div>

          {/* Email */}
          <div>
            <p className="text-xs font-mono text-gray-600 mb-1">EMAIL</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700"
              style={{
                background: 'rgba(0,245,255,0.03)',
                border: '1px solid rgba(0,245,255,0.15)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
            />
          </div>

          {/* Password */}
          <div>
            <p className="text-xs font-mono text-gray-600 mb-1">CONTRASEÑA</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700"
              style={{
                background: 'rgba(0,245,255,0.03)',
                border: '1px solid rgba(0,245,255,0.15)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm font-mono text-red-400 rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)' }}
            >
              {error}
            </p>
          )}

          {/* Mensaje */}
          {mensaje && (
            <p className="text-sm font-mono rounded-xl px-4 py-3"
              style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', color: '#00ff88' }}
            >
              {mensaje}
            </p>
          )}

          {/* Botón */}
          <button
            onClick={handleSubmit}
            disabled={cargando || !email || !password}
            className="w-full flex items-center justify-center gap-2 btn-neon-solid text-white py-3 rounded-xl font-orbitron font-bold text-sm tracking-widest disabled:opacity-40 transition-all"
          >
            <Zap size={16} />
            {cargando ? 'CONECTANDO...' : modo === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}
          </button>
        </div>
      </div>
    </div>
  )
}