const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

export async function parseDictation(texto, ivaDefecto = 21) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `Eres un asistente que interpreta dictados de voz para crear facturas en España.
Devuelve SOLO un JSON válido, sin texto adicional, sin markdown.

Reglas:
- Un precio en euros sin aclarar = precio SIN IVA
- "dos días", "tres sesiones" = cantidad
- Si dice precio total para varias unidades, calcula el precio unitario
- Si menciona plazo o validez en días, guárdalo en payment_terms
- Si dice "referencia X" o "ref X", guárdalo en reference (es opcional)
- Si no se menciona algo, ponlo null
- NO calcules totales, los calcula la app

Formato de respuesta:
{
  "lines": [
    {
      "reference": null,
      "description": "string",
      "quantity": 1,
      "unit_price": 0,
      "vat_rate": 21
    }
  ],
  "payment_terms": null,
  "notes": null
}`
        },
        {
          role: 'user',
          content: `IVA habitual: ${ivaDefecto}%. Texto dictado: "${texto}"`
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error('Error al conectar con la IA')
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  try {
    return JSON.parse(content)
  } catch {
    throw new Error('La IA no devolvió un formato válido')
  }
}