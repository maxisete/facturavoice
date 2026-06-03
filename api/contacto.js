import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  // Rate limiting: 5 peticiones por IP cada 15 minutos
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  const key = `ratelimit:contacto:${ip}`
  const limite = 5
  const ventana = 60 * 15 // 15 minutos en segundos

  const contador = await redis.incr(key)
  if (contador === 1) await redis.expire(key, ventana)
  if (contador > limite) {
    return res.status(429).json({ error: 'Demasiadas peticiones. Inténtalo en 15 minutos.' })
  }

  const { nombre, email, mensaje } = req.body

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  if (nombre.length > 100 || email.length > 200 || mensaje.length > 2000) {
    return res.status(400).json({ error: 'Los campos superan la longitud máxima permitida.' })
  }

  const nombreSanitizado = nombre.replace(/[<>]/g, '')
  const mensajeSanitizado = mensaje.replace(/[<>]/g, '')

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FacturaVoice Soporte <onboarding@resend.dev>',
        to: ['maxisete@gmail.com'],
        subject: `[FacturaVoice] Contacto de ${nombreSanitizado}`,
        html: `
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${nombreSanitizado}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${mensajeSanitizado}</p>
        `,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error enviando email')
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Error contacto:', err)
    return res.status(500).json({ error: 'Error al enviar el mensaje' })
  }
}