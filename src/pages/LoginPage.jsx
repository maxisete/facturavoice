import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Zap } from 'lucide-react'

export default function LoginPage({ mfaPendiente }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [confirmar, setConfirmar] = useState('')
  const [recuperando, setRecuperando] = useState(false)
  const [contactoNombre, setContactoNombre] = useState('')
  const [contactoEmail, setContactoEmail] = useState('')
  const [contactoMensaje, setContactoMensaje] = useState('')
  const [enviandoContacto, setEnviandoContacto] = useState(false)
  const [mensajeContacto, setMensajeContacto] = useState(false)
  const [mfaRequerido, setMfaRequerido] = useState(false)
  const [mfaCodigo, setMfaCodigo] = useState('')
  const [mfaError, setMfaError] = useState(null)
  const [mfaFactorId, setMfaFactorId] = useState(null)

  const verificarMFA = async () => {
    setMfaError(null)
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
    if (factorsError) { setMfaError('Error al obtener factores'); return }
    const totp = factorsData?.totp?.[0]
    if (!totp) { setMfaError('No se encontró factor 2FA'); return }
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totp.id })
    if (challengeError) { setMfaError('Error al crear el desafío'); return }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challengeData.id,
      code: mfaCodigo
    })
    if (verifyError) { setMfaError('Código incorrecto, inténtalo de nuevo'); return }
  }
  const handleContacto = async () => {
    setEnviandoContacto(true)
    try {
      await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: contactoNombre, email: contactoEmail, mensaje: contactoMensaje })
      })
      setMensajeContacto(true)
    } catch {
      // silencioso
    } finally {
      setEnviandoContacto(false)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    if (modo === 'registro') {
      if (password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.')
        return
      }
      if (!/[A-Z]/.test(password)) {
        setError('La contraseña debe contener al menos una letra mayúscula.')
        return
      }
      if (!/[0-9]/.test(password)) {
        setError('La contraseña debe contener al menos un número.')
        return
      }
      if (password !== confirmar) {
        setError('Las contraseñas no coinciden.')
        return
      }
    }
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
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aalData.nextLevel === 'aal2' && aalData.nextLevel !== aalData.currentLevel) {
          const { data: factorsData } = await supabase.auth.mfa.listFactors()
          const totp = factorsData?.totp?.[0]
          if (totp) {
            setMfaFactorId(totp.id)
            setMfaRequerido(true)
            await supabase.auth.signOut()
            return
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-5 py-10"
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

        {/* Card 2FA */}
        {mfaRequerido && (
          <div className="card-dark rounded-2xl p-6 space-y-4 mb-4">
            <p className="text-xs font-orbitron text-neon-cyan/50 tracking-widest">// VERIFICACIÓN 2FA</p>
            <p className="text-xs font-mono text-gray-400">Introduce el código de Google Authenticator:</p>
            <input
              type="number"
              value={mfaCodigo}
              onChange={e => setMfaCodigo(e.target.value)}
              placeholder="Código de 6 dígitos"
              className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none text-center tracking-widest"
              style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.15)' }}
            />
            {mfaError && <p className="text-xs font-mono text-red-400 text-center">{mfaError}</p>}
            <button onClick={verificarMFA} disabled={mfaCodigo.length !== 6}
              className="w-full py-3 rounded-xl btn-neon-solid text-white font-orbitron text-xs tracking-widest disabled:opacity-40"
            >
              VERIFICAR
            </button>
          </div>
        )}
        
        {/* Card login */}
        {!mfaRequerido && (
        <div className="card-dark rounded-2xl p-6 space-y-4">
          <div className="flex rounded-xl p-1 gap-1"
            style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.1)' }}
          >
            {['login', 'registro'].map(m => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`flex-1 py-2 rounded-lg font-mono text-sm transition-all ${
                  modo === m ? 'text-neon-cyan' : 'text-gray-600 hover:text-gray-400'
                }`}
                style={modo === m ? { background: 'rgba(0,245,255,0.1)', boxShadow: '0 0 10px rgba(0,245,255,0.15)' } : {}}
              >
                {m === 'login' ? 'ENTRAR' : 'REGISTRO'}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-mono text-gray-600 mb-1">EMAIL</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
              className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700"
              style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.15)' }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
            />
          </div>

          <div>
            <p className="text-xs font-mono text-gray-600 mb-1">CONTRASEÑA</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700"
              style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.15)' }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
            />
          </div>

          {modo === 'registro' && (
            <div>
              <p className="text-xs font-mono text-gray-600 mb-1">CONFIRMAR CONTRASEÑA</p>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="••••••••"
                className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700"
                style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.15)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
              />
            </div>
          )}

          {error && (
            <p className="text-sm font-mono text-red-400 rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)' }}
            >{error}</p>
          )}

          {mensaje && (
            <p className="text-sm font-mono rounded-xl px-4 py-3"
              style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', color: '#00ff88' }}
            >{mensaje}</p>
          )}

          <button onClick={handleSubmit} disabled={cargando || !email || !password}
            className="w-full flex items-center justify-center gap-2 btn-neon-solid text-white py-3 rounded-xl font-orbitron font-bold text-sm tracking-widest disabled:opacity-40 transition-all"
          >
            <Zap size={16} />
            {cargando ? 'CONECTANDO...' : modo === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}
          </button>

          {modo === 'login' && (
            <button
              onClick={async () => {
                if (!email) { setError('Introduce tu email primero.'); return }
                setRecuperando(true)
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: 'https://facturavoice.vercel.app',
                })
                setRecuperando(false)
                if (error) setError(error.message)
                else setMensaje('Te hemos enviado un email para restablecer tu contraseña.')
              }}
              disabled={recuperando}
              className="w-full text-center text-xs font-mono text-gray-600 hover:text-neon-cyan transition-colors py-1"
            >
              {recuperando ? 'ENVIANDO...' : '¿Olvidaste tu contraseña?'}
            </button>
          )}
        </div>
        )}

        {/* Formulario de contacto */}
        <div className="mt-4 text-center">
          <a href="/privacidad" className="text-xs font-mono text-gray-600 hover:text-neon-cyan transition-colors">
            Política de Privacidad y Aviso Legal
          </a>
        </div>

        <div className="mt-4 card-dark rounded-2xl p-6 space-y-4">
          <p className="text-xs font-orbitron text-neon-cyan/50 tracking-widest">// CONTACTO / SOPORTE</p>

          {!mensajeContacto ? (
            <div className="space-y-3">
              <input type="text" value={contactoNombre} onChange={e => setContactoNombre(e.target.value)} placeholder="Tu nombre"
                className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700"
                style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.15)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
              />
              <input type="email" value={contactoEmail} onChange={e => setContactoEmail(e.target.value)} placeholder="Tu email"
                className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700"
                style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.15)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
              />
              <textarea value={contactoMensaje} onChange={e => setContactoMensaje(e.target.value)} placeholder="¿En qué podemos ayudarte?" rows={3}
                className="w-full text-sm text-white font-mono rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700 resize-none"
                style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.15)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
              />
              <button onClick={handleContacto} disabled={enviandoContacto || !contactoNombre || !contactoEmail || !contactoMensaje}
                className="w-full py-3 rounded-xl btn-neon text-neon-cyan font-orbitron text-xs tracking-widest disabled:opacity-40 transition-all"
              >
                {enviandoContacto ? 'ENVIANDO...' : 'ENVIAR MENSAJE'}
              </button>
            </div>
          ) : (
            <p className="text-sm font-mono text-center py-2" style={{ color: '#00ff88' }}>
              ✓ Mensaje enviado. Te responderemos pronto.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}