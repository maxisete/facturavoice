import { Redis } from '@upstash/redis'
import { obtenerUsuario } from './_lib/autenticacion.js'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const MODELO = 'openai/gpt-oss-120b'
const MAX_MENSAJES = 10
const MAX_CARACTERES_MENSAJE = 12000
const ROLES_PERMITIDOS = ['system', 'user']
const VENTANA = 60 * 15 // 15 minutos en segundos

// Suma una petición al contador de la clave e indica si se ha superado el límite.
async function superaLimite(clave, limite) {
  const contador = await redis.incr(clave)
  if (contador === 1) await redis.expire(clave, VENTANA)
  return contador > limite
}

// Devuelve el valor dentro de [minimo, maximo], o el valor por defecto si no es un número.
function acotar(valor, minimo, maximo, porDefecto) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return porDefecto
  return Math.min(maximo, Math.max(minimo, numero))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  // 1. Sesión obligatoria: solo usuarios de FacturaVoice pueden usar la IA.
  const usuario = await obtenerUsuario(req)
  if (!usuario) {
    return res.status(401).json({ error: 'Debes iniciar sesión.' })
  }

  // 2. Límites: 30 peticiones por usuario y 60 por IP cada 15 minutos.
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'desconocida'
  if (
    await superaLimite(`ratelimit:groq:usuario:${usuario.id}`, 30) ||
    await superaLimite(`ratelimit:groq:ip:${ip}`, 60)
  ) {
    return res.status(429).json({ error: 'Demasiadas peticiones. Inténtalo en 15 minutos.' })
  }

  // 3. Validación de los mensajes.
  const { messages, temperature, max_tokens } = req.body || {}
  const mensajesValidos = Array.isArray(messages)
    && messages.length > 0
    && messages.length <= MAX_MENSAJES
    && messages.every(m =>
      m
      && ROLES_PERMITIDOS.includes(m.role)
      && typeof m.content === 'string'
      && m.content.length > 0
      && m.content.length <= MAX_CARACTERES_MENSAJE
    )
  if (!mensajesValidos) {
    return res.status(400).json({ error: 'Petición no válida.' })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELO,
        // Solo se reenvían role y content: cualquier otro campo se descarta.
        messages: messages.map(({ role, content }) => ({ role, content })),
        temperature: acotar(temperature, 0, 1, 0.1),
        max_tokens: Math.round(acotar(max_tokens, 1, 4000, 1000)),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error en Groq API')
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('Error Groq:', err)
    return res.status(500).json({ error: 'Error al conectar con la IA' })
  }
}