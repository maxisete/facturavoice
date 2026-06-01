import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, User, Mic, MicOff, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'
import { useVoice } from '../hooks/useVoice'
import { parseDictation } from '../lib/groq'

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
        const prompt = `Extrae los datos de un cliente de este texto y devuelve SOLO JSON sin markdown:
{
  "nombre": "nombre completo o razón social",
  "nif": "DNI o CIF o null",
  "telefono": "teléfono o null",
  "email": "email o null",
  "direccion": "dirección o null",
  "ciudad": "ciudad o null"
}
Texto: "${texto}"`

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
          })
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
    if (!formCliente.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const nuevoCliente = { ...formCliente, id: crypto.randomUUID() }
    
    if (user) {
      await supabase.from('clientes').insert({ ...formCliente, user_id: user.id })
    }
    
    addCliente(nuevoCliente)
    if (onSeleccionar) {
      onSeleccionar(nuevoCliente)
    } else {
      setCreando(false)
      setFormCliente({ nombre: '', nif: '', telefono: '', email: '', direccion: '', ciudad: '' })
    }
  }

  const handleSeleccionar = (cliente) => {
    if (onSeleccionar) {
      onSeleccionar(cliente)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-bold text-gray-900 flex-1">Clientes</h1>
        <button
          onClick={() => setCreando(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={15} />
          Nuevo
        </button>
      </header>

      <div className="px-5 py-4 max-w-lg mx-auto space-y-4">
        {/* Buscador */}
        {!creando && (
          <>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, NIF o email…"
              className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brand/50"
            />

            <div className="space-y-2">
              {clientesFiltrados.length === 0 && (
                <p className="text-center text-gray-300 text-sm py-8">
                  {clientes.length === 0 ? 'Aún no tienes clientes. Crea el primero.' : 'Sin resultados.'}
                </p>
              )}
              {clientesFiltrados.map(cliente => (
                <button
                  key={cliente.id}
                  onClick={() => handleSeleccionar(cliente)}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 text-left hover:border-brand/30 transition-colors"
                >
                  <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{cliente.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {[cliente.nif, cliente.telefono, cliente.email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Formulario nuevo cliente */}
        {creando && (
          <div className="space-y-4">
            {/* Botón de voz */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <button
                onClick={handleVozCliente}
                disabled={procesando}
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  grabando ? 'bg-brand' : 'bg-gray-900 hover:bg-brand'
                }`}
              >
                {grabando ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {procesando ? 'Procesando…' : grabando ? 'Escuchando…' : 'Dicta los datos del cliente'}
                </p>
                <p className="text-xs text-gray-400">
                  {grabando ? 'Pulsa para terminar' : 'Nombre, DNI, teléfono, dirección…'}
                </p>
              </div>
            </div>

            {grabando && transcripcion && (
              <p className="text-sm text-gray-400 px-1">{transcripcion}</p>
            )}

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Campos */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {[
                { campo: 'nombre', label: 'Nombre *', placeholder: 'Juan García López' },
                { campo: 'nif', label: 'DNI / NIF', placeholder: '12345678X' },
                { campo: 'telefono', label: 'Teléfono', placeholder: '600 000 000' },
                { campo: 'email', label: 'Email', placeholder: 'juan@ejemplo.com' },
                { campo: 'direccion', label: 'Dirección', placeholder: 'Calle Mayor 1' },
                { campo: 'ciudad', label: 'Ciudad', placeholder: 'Madrid' },
              ].map(({ campo, label, placeholder }) => (
                <div key={campo} className="px-4 py-3 border-b border-gray-50 last:border-0">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <input
                    value={formCliente[campo]}
                    onChange={e => setFormCliente(prev => ({ ...prev, [campo]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full text-sm text-gray-900 bg-transparent focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setCreando(false); setError(null) }}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarCliente}
                className="flex-1 py-3 rounded-2xl bg-brand text-white text-sm font-medium"
              >
                Guardar cliente
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