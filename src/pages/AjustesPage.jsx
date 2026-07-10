import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, LogOut, Shield, ShieldCheck } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { registrarAccion } from '../lib/auditoria'
import { Trash2 } from 'lucide-react'
import ModalEliminarCuenta from '../components/ModalEliminarCuenta'

export default function AjustesPage() {
  const navigate = useNavigate()
  const { negocio, setNegocio, setContadores, plantillaPDF, setPlantillaPDF, tema, setTema } = useAppStore()
  const [form, setForm] = useState({
    nombre_usuario: negocio?.nombre_usuario || '',
    nombre: negocio?.nombre || '',
    nif: negocio?.nif || '',
    direccion: negocio?.direccion || '',
    ciudad: negocio?.ciudad || '',
    telefono: negocio?.telefono || '',
    email: negocio?.email || '',
    iva_defecto: negocio?.iva_defecto || 21,
    color_marca: negocio?.color_marca || '#FF5C39',
    contador_presupuesto: negocio?.contador_presupuesto || 1,
    contador_factura: negocio?.contador_factura || 1,
    contador_albaran: negocio?.contador_albaran || 1,
  })
  const [contactoNombre, setContactoNombre] = useState('')
  const [contactoEmail, setContactoEmail] = useState('')
  const [contactoMensaje, setContactoMensaje] = useState('')
  const [enviandoContacto, setEnviandoContacto] = useState(false)
  const [mensajeContacto, setMensajeContacto] = useState(false)
  const [mfaActivado, setMfaActivado] = useState(false)
  const [mfaQR, setMfaQR] = useState(null)
  const [mfaSecret, setMfaSecret] = useState(null)
  const [mfaFactorId, setMfaFactorId] = useState(null)
  const [mfaCodigo, setMfaCodigo] = useState('')
  const [mfaError, setMfaError] = useState(null)
  const [mfaPaso, setMfaPaso] = useState('idle') // idle | qr | verificando | activado
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false)

  const comprobarMFA = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data?.totp?.find(f => f.status === 'verified')
    if (totp) { setMfaActivado(true); setMfaFactorId(totp.id) }
  }

  const activarMFA = async () => {
    setMfaError(null)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'FacturaVoice' })
    if (error) { setMfaError('Error al generar el QR'); return }
    setMfaQR(data.totp.qr_code)
    setMfaSecret(data.totp.secret)
    setMfaFactorId(data.id)
    setMfaPaso('qr')
  }

  const verificarMFA = async () => {
    setMfaError(null)
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
    if (challengeError) { setMfaError('Error al crear el desafío'); return }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challengeData.id,
      code: mfaCodigo
    })
    if (verifyError) { setMfaError('Código incorrecto, inténtalo de nuevo'); return }
    setMfaActivado(true)
    setMfaPaso('idle')
  }

  const desactivarMFA = async () => {
    await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
    setMfaActivado(false)
    setMfaFactorId(null)
    setMfaPaso('idle')
  }

  const handleGuardar = async () => {
    const año = new Date().getFullYear()
    setNegocio(form)
    setContadores({
      [`P-${año}`]: form.contador_presupuesto - 1,
      [`F-${año}`]: form.contador_factura - 1,
      [`A-${año}`]: form.contador_albaran - 1,
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('negocios').upsert({ id: user.id, ...form })
      await registrarAccion('cambiar_ajustes', { nombre: form.nombre, email: form.email })
    }
    navigate(-1)
  }

  const handleCampo = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }))

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

  useState(() => { comprobarMFA() }, [])
  
  const camposNegocio = [
    { campo: 'nombre_usuario', label: 'Tu nombre', tipo: 'text', placeholder: 'Maxi, Emilio, Juan Luis…' },
    { campo: 'nombre', label: 'Nombre o razón social', tipo: 'text', placeholder: 'Pinturas García S.L.' },
    { campo: 'nif', label: 'NIF / CIF', tipo: 'text', placeholder: 'B12345678' },
    { campo: 'direccion', label: 'Dirección', tipo: 'text', placeholder: 'Calle Mayor 1' },
    { campo: 'ciudad', label: 'Ciudad', tipo: 'text', placeholder: 'Madrid' },
    { campo: 'telefono', label: 'Teléfono', tipo: 'tel', placeholder: '600 000 000' },
    { campo: 'email', label: 'Email', tipo: 'email', placeholder: 'info@minegocio.es' },
  ]

  return (
    <div className="min-h-screen bg-void">
      <header className="px-5 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(0,245,255,0.15)', background: 'rgba(10,10,15,0.98)' }}
      >
        <button onClick={() => navigate(-1)} className="text-neon-cyan">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-orbitron font-bold text-white flex-1 neon-cyan">AJUSTES</h1>
        <button
          onClick={handleGuardar}
          className="flex items-center gap-2 btn-neon-solid px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest"
        >
          <Save size={14} />
          GUARDAR
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut() }}
          className="p-2 text-gray-600 hover:text-neon-pink transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="px-5 py-5 space-y-4 max-w-lg mx-auto">

        {/* Acceso a Empresa */}
        <button
          onClick={() => navigate('/empresa')}
          className="w-full card-dark rounded-xl p-4 flex items-center justify-between hover:border-neon-cyan/30 transition-colors"
        >
          <div className="text-left">
            <p className="text-sm font-mono text-white">Datos de tu empresa</p>
            <p className="text-xs font-mono text-gray-600">Nombre, NIF, dirección, contacto</p>
          </div>
          <ChevronLeft size={18} className="text-neon-cyan rotate-180" />
        </button>

        {/* Sección preferencias */}
        <div className="card-dark rounded-xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-orbitron text-neon-cyan/50 tracking-widest">
            // PREFERENCIAS
          </p>
          {[
            { campo: 'iva_defecto', label: 'IVA por defecto (%)', tipo: 'number', parser: v => parseFloat(v) || 21 },
            { campo: 'contador_presupuesto', label: 'Próximo nº de presupuesto', tipo: 'number', parser: v => parseInt(v) || 1 },
            { campo: 'contador_factura', label: 'Próximo nº de factura', tipo: 'number', parser: v => parseInt(v) || 1 },
            { campo: 'contador_albaran', label: 'Próximo nº de albarán', tipo: 'number', parser: v => parseInt(v) || 1 },
          ].map(({ campo, label, tipo, parser }) => (
            <div key={campo} className="px-4 py-3" style={{ borderTop: '1px solid rgba(0,245,255,0.07)' }}>
              <p className="text-xs font-mono text-gray-600 mb-1">{label}</p>
              <input
                type={tipo}
                value={form[campo]}
                onChange={e => handleCampo(campo, parser(e.target.value))}
                className="w-full text-sm text-white bg-transparent focus:outline-none font-mono"
              />
            </div>
          ))}
          
          <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(0,245,255,0.07)' }}>
            <p className="text-xs font-mono text-gray-600 mb-3">Plantilla de PDF</p>
            <div className="grid grid-cols-2 gap-2">
              {['clasica', 'minimal', 'moderna', 'editorial'].map(p => (
                <button
                  key={p}
                  onClick={() => setPlantillaPDF(p)}
                  className={`py-2 rounded-xl font-mono text-sm transition-all ${
                    plantillaPDF === p
                      ? 'text-neon-cyan border border-neon-cyan/50 bg-neon-cyan/10'
                      : 'text-gray-600 border border-white/10 hover:border-neon-cyan/30'
                  }`}
                  style={plantillaPDF === p ? { boxShadow: '0 0 10px rgba(0,245,255,0.15)' } : {}}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(0,245,255,0.07)' }}>
            <p className="text-xs font-mono text-gray-600 mb-3">Aspecto de la app</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'clasica', label: 'Clásica' },
                { id: 'ochentera', label: 'Ochentera' },
                { id: 'chispa', label: 'Chispa' },
                { id: 'editorial', label: 'Editorial' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTema(id)}
                  className={`py-2 rounded-xl font-mono text-sm transition-all ${
                    tema === id
                      ? 'text-neon-cyan border border-neon-cyan/50 bg-neon-cyan/10'
                      : 'text-gray-600 border border-white/10 hover:border-neon-cyan/30'
                  }`}
                  style={tema === id ? { boxShadow: '0 0 10px rgba(0,245,255,0.15)' } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sección 2FA */}
        <div className="card-dark rounded-xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-orbitron text-neon-cyan/50 tracking-widest">
            // SEGURIDAD — 2FA
          </p>
          <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(0,245,255,0.07)' }}>
            {mfaActivado ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} style={{ color: '#00ff88', filter: 'drop-shadow(0 0 6px #00ff88)' }} />
                  <div>
                    <p className="text-sm font-mono text-white">2FA activado</p>
                    <p className="text-xs font-mono text-gray-600">Tu cuenta está protegida</p>
                  </div>
                </div>
                <button onClick={desactivarMFA} className="text-xs font-mono text-neon-pink border border-neon-pink/30 px-3 py-1.5 rounded-lg">
                  DESACTIVAR
                </button>
              </div>
            ) : mfaPaso === 'idle' ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-gray-600" />
                  <div>
                    <p className="text-sm font-mono text-white">2FA desactivado</p>
                    <p className="text-xs font-mono text-gray-600">Recomendamos activarlo</p>
                  </div>
                </div>
                <button onClick={activarMFA} className="text-xs font-mono text-neon-cyan border border-neon-cyan/30 px-3 py-1.5 rounded-lg">
                  ACTIVAR
                </button>
              </div>
            ) : mfaPaso === 'qr' ? (
              <div className="space-y-4">
                <p className="text-xs font-mono text-gray-400">Escanea este QR con Google Authenticator:</p>
                {mfaQR && <img src={mfaQR} alt="QR 2FA" className="w-40 h-40 mx-auto rounded-xl" />}
                <p className="text-xs font-mono text-gray-600 text-center break-all">Clave: {mfaSecret}</p>
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
                  className="w-full py-3 rounded-xl btn-neon text-neon-cyan font-orbitron text-xs tracking-widest disabled:opacity-40"
                >
                  VERIFICAR Y ACTIVAR
                </button>
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Formulario de contacto */}
        <div className="card-dark rounded-xl p-6 space-y-4">
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
        
        {/* Zona de peligro */}
        <div className="card-dark rounded-xl p-4" style={{ border: '1px solid rgba(255,50,50,0.2)' }}>
          <p className="text-xs font-orbitron text-red-400/60 tracking-widest mb-3">// ZONA DE PELIGRO</p>
          <button
            onClick={() => setMostrarModalEliminar(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 font-orbitron text-xs tracking-widest"
          >
            <Trash2 size={14} />
            ELIMINAR CUENTA
          </button>
        </div>

        {mostrarModalEliminar && (
          <ModalEliminarCuenta onClose={() => setMostrarModalEliminar(false)} mfaActivo={mfaActivado} />
        )}

      </div>
    </div>
  )
}