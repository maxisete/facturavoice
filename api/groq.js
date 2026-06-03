export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
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