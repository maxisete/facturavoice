import { supabase } from './supabase'

// Llama a la IA a través de /api/groq, enviando el token de la sesión.
// Devuelve la respuesta de Groq o lanza un error con el motivo.
export async function llamarIA({ messages, temperature = 0.1, max_tokens = 1000 }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Debes iniciar sesión para usar la IA.')

  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages, temperature, max_tokens }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Error al conectar con la IA')
  return data
}

export async function parseDictation(texto, ivaDefecto = 21) {
  const data = await llamarIA({
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
      "description": "string con la primera letra en mayúscula",
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

  const content = data.choices[0]?.message?.content

  try {
    const resultado = JSON.parse(content)
    if (resultado.lines) {
      resultado.lines = resultado.lines.map(l => ({
        ...l,
        description: l.description
          ? l.description.charAt(0).toUpperCase() + l.description.slice(1)
          : l.description
      }))
    }
    return resultado
  } catch {
    throw new Error('La IA no devolvió un formato válido')
  }
}