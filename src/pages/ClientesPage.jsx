import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, User, Mic, MicOff, AlertCircle, Zap } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { useVoice } from '../hooks/useVoice'

export default function ClientesPage({ onSeleccionar }) {
  const navigate = useNavigate()
  const { clientes, addCliente, setClientes } = useAppStore()

  useEffect(() => {
    const cargarClientes = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('clientes').select('*').eq('user_id', user.id)
        if (data) setClientes(data)
      }
    }
    cargarClientes()
  }, [])

  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)
  const [formCliente, setFormCliente] = useState({
    nombre: '', nif: '', telefono: '', email: '', direccion: '', ciudad: ''
  })

  const { grabando, transcripcion, transcripcionRef, iniciarGrabacion, detenerGrabacion } = useVoice()

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.nif && c.nif.includes(busqueda)) ||
    (c.email && c.email.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const handleVozCliente = async () => {
    if (grabando) {
      detenerGrabacion()
      await esperar(2000)
      const texto = transcripcionRef.current.trim()
      if (!texto) return
      try {
        setProcesando(true)
        const prompt = `Extrae los datos de un cliente de este texto y devuelve SOLO JSON sin markdown:\n{\n  "nombre": "nombre completo o razón social",\n  "nif": "DNI o CIF o null",\n  "telefono": "teléfono o null",\n  "email": "email o null",\n  "direccion": "dirección o null",\n  "ciudad": "ciudad o null"\n}\nTexto: "${texto}"`
        const response = await fetch('/api/groq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temperature: 0.1, max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
        })
        const data = await response.json()
        const parsed = JSON.parse(data.choices[0].message.content)
        setFormCliente({
          nombre: parsed.nombre || '',
          nif: parsed.nif || '',
          telefono: parsed.telefono || '',
          email: parsed.email || '',
          direccion: parsed.direccion || '',
          ciudad: parsed.ciudad || '',
        })
      } catch {
        setError('No se pudieron extraer los datos. Rellena el formulario manualmente.')
      } finally {
        setProcesando(false)
      }
    } else {
      setError(null)
      iniciarGrabacion()
    }
  }

  const handleGuardarCliente = async () => {
    if (!formCliente.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const nuevoCliente = { ...formCliente, id: crypto.randomUUID() }
    if (user) await supabase.from('clientes').insert({ ...formCliente, user_id: user.id })
    addCliente(nuevoCliente)
    if (onSeleccionar) {
      onSeleccionar(nuevoCliente)
    } else {
      setCreando(false)
      setFormCliente({ nombre: '', nif: '', telefono: '', email: '', direccion: '', ciudad: '' })
    }
  }

  return (
    <div className="min-h-screen bg-void">
      <header className="px-5 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(0,245,255,0.15)', background: 'rgba(10,10,15,0.98)' }}
      >
        <button onClick={() => navigate(-1)} className="text-neon-cyan">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-orbitron font-bold text-white flex-1 neon-cyan">CLIENTES</h1>
        {!creando && (
          <button
            onClick={() => setCreando(true)}
            className="flex items-center gap-2 btn-neon-solid px-4 py-2 rounded-xl font-orbitron text-xs tracking-widest"
          >
            <Plus size={14} />
            NUEVO
          </button>
        )}
      </header>

      <div className="px-5 py-4 max-w-lg mx-auto space-y-4">

        {!creando && (
          <>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, NIF o email…"
              className="w-full font-mono text-sm text-white rounded-xl px-4 py-3 focus:outline-none transition-all placeholder-gray-700"
              style={{
                background: 'rgba(0,245,255,0.03)',
                border: '1px solid rgba(0,245,255,0.15)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
            />

            <div className="space-y-2">
              {clientesFiltrados.length === 0 && (
                <p className="text-center text-gray-600 text-sm font-mono py-8">
                  {clientes.length === 0 ? '// Sin clientes. Crea el primero.' : '// Sin resultados.'}
                </p>
              )}
              {clientesFiltrados.map(cliente => (
                <button
                  key={cliente.id}
                  onClick={() => onSeleccionar ? onSeleccionar(cliente) : null}
                  className="w-full flex items-center gap-4 card-dark rounded-xl p-4 text-left transition-all"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)' }}
                  >
                    <User size={18} className="text-neon-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-medium text-white truncate">{cliente.nombre}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {[cliente.nif, cliente.telefono, cliente.email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {creando && (
          <div className="space-y-4">
            {/* Botón voz */}
            <div className="card-dark rounded-xl p-4 flex items-center gap-4">
              <button
                onClick={handleVozCliente}
                disabled={procesando}
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={grabando ? {
                  background: 'rgba(0,245,255,0.1)',
                  border: '2px solid #00f5ff',
                  boxShadow: '0 0 20px rgba(0,245,255,0.3)'
                } : {
                  background: 'linear-gradient(135deg, #FF5C39, #ff2d00)',
                  boxShadow: '0 0 15px rgba(255,92,57,0.4)'
                }}
              >
                {grabando ? <MicOff size={18} className="text-neon-cyan" /> : <Mic size={18} className="text-white" />}
              </button>
              <div>
                <p className="text-sm font-orbitron text-white">
                  {procesando ? 'PROCESANDO...' : grabando ? 'ESCUCHANDO...' : 'DICTAR CLIENTE'}
                </p>
                <p className="text-xs text-gray-600 font-mono mt-0.5">
                  {grabando ? 'Pulsa para terminar' : 'Nombre, DNI, teléfono, dirección…'}
                </p>
              </div>
            </div>

            {grabando && transcripcion && (
              <p className="text-sm text-gray-500 font-mono px-1">{transcripcion}</p>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)' }}
              >
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-mono">{error}</p>
              </div>
            )}

            {/* Campos */}
            <div className="card-dark rounded-xl overflow-hidden">
              {[
                { campo: 'nombre', label: 'NOMBRE *', placeholder: 'Juan García López' },
                { campo: 'nif', label: 'DNI / NIF', placeholder: '12345678X' },
                { campo: 'telefono', label: 'TELÉFONO', placeholder: '600 000 000' },
                { campo: 'email', label: 'EMAIL', placeholder: 'juan@ejemplo.com' },
                { campo: 'direccion', label: 'DIRECCIÓN', placeholder: 'Calle Mayor 1' },
                { campo: 'ciudad', label: 'CIUDAD', placeholder: 'Madrid' },
              ].map(({ campo, label, placeholder }) => (
                <div key={campo} className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,245,255,0.07)' }}>
                  <p className="text-xs font-mono text-gray-600 mb-1">{label}</p>
                  <input
                    value={formCliente[campo]}
                    onChange={e => setFormCliente(prev => ({ ...prev, [campo]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full text-sm text-white font-mono bg-transparent focus:outline-none placeholder-gray-700"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setCreando(false); setError(null) }}
                className="flex-1 py-3 rounded-xl font-mono text-sm text-gray-600 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                CANCELAR
              </button>
              <button
                onClick={handleGuardarCliente}
                className="flex-1 py-3 rounded-xl btn-neon-solid font-orbitron font-bold text-sm tracking-widest"
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap size={14} />
                  GUARDAR
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}