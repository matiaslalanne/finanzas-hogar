const Anthropic = require('@anthropic-ai/sdk')

const RUBROS = [
  'Alquiler', 'Supermercado', 'Restaurantes', 'Delivery', 'Social',
  'Salud', 'Auto', 'Limpieza y Hogar', 'Suscripciones', 'Ropa e Indumentaria',
  'Oficina', 'Deporte', 'Transporte', 'Cancha', 'Otros',
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { pdfBase64 } = JSON.parse(event.body ?? '{}')
    if (!pdfBase64) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Falta pdfBase64' }) }
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          },
          {
            type: 'text',
            text: `Sos un asistente para parsear resúmenes de tarjetas de crédito argentinas.

Extraé todos los consumos/gastos. NO incluyas: pagos, acreditaciones, cargos del banco (IVA de cargos, seguros), ni saldos anteriores.

Para cada consumo devolvé:
- fecha: YYYY-MM-DD (usá el año del resumen)
- descripcion: nombre del comercio, máx 100 caracteres
- monto: número positivo sin símbolo de moneda
- moneda: "ARS" o "USD"
- rubro_sugerido: exactamente uno de: ${RUBROS.join(' | ')}

Devolvé SOLO el JSON array, sin texto adicional:
[{"fecha":"YYYY-MM-DD","descripcion":"...","monto":0,"moneda":"ARS","rubro_sugerido":"Otros"}]

Si no hay consumos: []`,
          },
        ],
      }],
    })

    const raw = message.content[0]?.text?.trim() ?? '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    let transacciones = []
    if (match) {
      try { transacciones = JSON.parse(match[0]) } catch { transacciones = [] }
    }

    transacciones = transacciones
      .filter(t => t.fecha && Number(t.monto) > 0)
      .map(t => ({
        fecha: String(t.fecha).slice(0, 10),
        descripcion: String(t.descripcion ?? '').slice(0, 100).trim(),
        monto: Math.abs(Number(t.monto)),
        moneda: t.moneda === 'USD' ? 'USD' : 'ARS',
        rubro_sugerido: RUBROS.includes(t.rubro_sugerido) ? t.rubro_sugerido : 'Otros',
      }))

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ transacciones }),
    }
  } catch (err) {
    console.error('parse-pdf error:', err)
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message ?? 'Error al procesar el PDF' }),
    }
  }
}
