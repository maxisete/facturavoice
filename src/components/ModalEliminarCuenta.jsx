import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ModalEliminarCuenta({ onClose, mfaActivo }) {
  const [password, setPassword] = useState('')
  const [textoConfirmacion, setTextoConfirmacion] = useState('')
  const [codigoMfa, setCodigoMfa] = useState('')
  const [error, setError] = useState(null)
  const [borrando, setBorrando] = useState(false)

  const puedeConfirmar = password.length > 0 && textoConfirmacion === 'ELIMINAR' && (!mfaActivo || codigoMfa.length === 6)

  const handleEliminar = async () => {
    setError(null)
    setBorrando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Verificar contraseña reautenticando
      const { error: errPass } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      })
      if (errPass) { setError('Contraseña incorrecta.'); setBorrando(false); return }

      // 2. Si tiene 2FA, verificar el código
      if (mfaActivo) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.find(f => f.status === 'verified')
        const { data: challenge, error: errChallenge } = await supabase.auth.mfa.challenge({ factorId: totp.id })
        if (errChallenge) { setError('Error al verificar 2FA.'); setBorrando(false); return }
        const { error: errVerify } = await supabase.auth.mfa.verify({
          factorId: totp.id,
          challengeId: challenge.id,
          code: codigoMfa,
        })
        if (errVerify) { setError('Código 2FA incorrecto.'); setBorrando(false); return }
      }

      // 3. Llamar al endpoint de borrado con el token de sesión
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/eliminar-cuenta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!res.ok) throw new Error('Error al eliminar la cuenta')

      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (err) {
      setError('No se pudo eliminar la cuenta. Inténtalo de nuevo.')
      setBorrando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="card-dark rounded-2xl p-6 w-full max-w-md space-y-4" style={{ border: '1px solid rgba(255,50,50,0.3)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            <h2 className="font-orbitron font-bold text-white">ELIMINAR CUENTA</h2>
          </div>
          <button onClick={onClose} className="text-gray-500"><X size={20} /></button>
        </div>

        <p className="text-xs font-mono text-gray-400 leading-relaxed">
          Esta acción es <strong className="text-red-400">irreversible</strong>. Se borrarán tu cuenta, tus clientes y tus documentos.
          Eres responsable de conservar copia de tus facturas si la ley te obliga a ello (normalmente 4-6 años).
          FacturaVoice no se hace responsable de la pérdida de documentos tras la eliminación.
        </p>

        <div>
          <p className="text-xs font-mono text-gray-600 mb-1">Tu contraseña</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full text-sm text-white bg-transparent border border-white/10 rounded-lg px-3 py-2 focus:outline-none"
          />
        </div>

        {mfaActivo && (
          <div>
            <p className="text-xs font-mono text-gray-600 mb-1">Código 2FA (6 dígitos)</p>
            <input
              type="number"
              value={codigoMfa}
              onChange={e => setCodigoMfa(e.target.value)}
              className="w-full text-sm text-white bg-transparent border border-white/10 rounded-lg px-3 py-2 focus:outline-none text-center tracking-widest"
            />
          </div>
        )}

        <div>
          <p className="text-xs font-mono text-gray-600 mb-1">Escribe <strong className="text-red-400">ELIMINAR</strong> para confirmar</p>
          <input
            type="text"
            value={textoConfirmacion}
            onChange={e => setTextoConfirmacion(e.target.value)}
            className="w-full text-sm text-white bg-transparent border border-white/10 rounded-lg px-3 py-2 focus:outline-none"
          />
        </div>

        {error && <p className="text-xs font-mono text-red-400">{error}</p>}

        <button
          onClick={handleEliminar}
          disabled={!puedeConfirmar || borrando}
          className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-orbitron text-xs tracking-widest disabled:opacity-30"
        >
          {borrando ? 'ELIMINANDO...' : 'ELIMINAR MI CUENTA PERMANENTEMENTE'}
        </button>
      </div>
    </div>
  )
}