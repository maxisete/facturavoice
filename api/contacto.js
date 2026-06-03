export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { nombre, email, mensaje } = req.body

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

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
        subject: `[FacturaVoice] Contacto de ${nombre}`,
        html: `
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${mensaje}</p>
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