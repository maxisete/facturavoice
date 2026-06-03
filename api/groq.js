import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  // Rate limiting: 30 peticiones por IP cada 15 minutos
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  const key = `ratelimit:groq:${ip}`
  const limite = 30
  const ventana = 60 * 15

  const contador = await redis.incr(key)
  if (contador === 1) await redis.expire(key, ventana)
  if (contador > limite) {
    return res.status(429).json({ error: 'Demasiadas peticiones. Inténtalo en 15 minutos.' })
  }

  const { messages, temperature = 0.1, max_tokens = 1000 } = req.body

  if (!messages) {
    return res.status(400).json({ error: 'Faltan parámetros' })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature,
        max_tokens,
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