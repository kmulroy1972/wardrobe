// Garment photo analysis: Claude vision reads a photo and returns catalog
// fields (name, category, color, pattern, material, dress code, weight).
// Key resolution matches the stylist function: env secret, else the
// private_settings table.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

async function getKey(): Promise<string | null> {
  const envKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (envKey) return envKey
  const url = Deno.env.get('SUPABASE_URL')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !service) return null
  const res = await fetch(`${url}/rest/v1/private_settings?select=anthropic_api_key&limit=1`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  })
  if (!res.ok) return null
  const rows = await res.json()
  const key = rows?.[0]?.anthropic_api_key
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

const CATEGORIES = [
  'suit', 'blazer', 'dress_shirt', 'casual_shirt', 'polo', 't_shirt', 'sweater',
  'dress_pants', 'chinos', 'jeans', 'shorts', 'dress_shoes', 'casual_shoes', 'boots',
  'outerwear', 'tie', 'belt', 'pocket_square', 'scarf', 'hat', 'gloves', 'watch',
  'cufflinks', 'socks', 'bag', 'accessory',
]
const COLORS = [
  'White', 'Cream', 'Light blue', 'Blue', 'Navy', 'Gray', 'Charcoal', 'Black',
  'Brown', 'Tan', 'Khaki', 'Olive', 'Green', 'Burgundy', 'Red', 'Pink',
  'Purple', 'Orange', 'Yellow', 'Multi / Pattern',
]

const PROMPT = `This photo shows one menswear garment or accessory being cataloged for a personal wardrobe app. Analyze it and respond with ONLY a JSON object (no code fences, no commentary):
{
  "name": "short descriptive name, e.g. 'Navy chalk-stripe suit' or 'Brown suede loafers'",
  "category": "one of: ${CATEGORIES.join(', ')}",
  "color": "the dominant color, one of: ${COLORS.join(', ')}",
  "pattern": "e.g. 'Solid', 'Stripe', 'Check', 'Herringbone', 'Plaid' — or '' if unclear",
  "material": "best guess, e.g. 'Wool', 'Cotton', 'Denim', 'Leather' — or '' if unclear",
  "brand": "brand name ONLY if a label/logo is clearly visible, else ''",
  "formality": "one of: formal, business_casual, casual",
  "warmth": "garment weight — one of: light, mid, warm, all (use 'all' for shoes/accessories)"
}
Category guidance: full suits (jacket+trousers shown together) = suit; sport coats alone = blazer; button-front shirts with stiff collars = dress_shirt, softer/patterned casual button-ups = casual_shirt; sneakers = casual_shoes; oxfords/derbies/loafers = dress_shoes.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const key = await getKey()
  if (!key) return json({ error: 'no_key' })

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  const { image, media_type = 'image/jpeg' } = payload
  if (!image || typeof image !== 'string') return json({ error: 'bad_request' }, 400)

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type, data: image } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  })

  if (!resp.ok) {
    const detail = await resp.text()
    return json({ error: 'anthropic_error', detail: detail.slice(0, 500) }, 502)
  }
  const data = await resp.json()
  const text = (data.content ?? [])
    .map((b: { type: string; text?: string }) => (b.type === 'text' ? b.text : ''))
    .join('')
    .replace(/```json|```/g, '')
    .trim()

  try {
    const fields = JSON.parse(text)
    // Only pass through known keys with valid enum values
    const clean: Record<string, string> = {}
    if (typeof fields.name === 'string' && fields.name) clean.name = fields.name.slice(0, 80)
    if (CATEGORIES.includes(fields.category)) clean.category = fields.category
    const color = COLORS.find((c) => c.toLowerCase() === String(fields.color || '').toLowerCase())
    if (color) clean.color = color
    if (typeof fields.pattern === 'string' && fields.pattern) clean.pattern = fields.pattern.slice(0, 40)
    if (typeof fields.material === 'string' && fields.material) clean.material = fields.material.slice(0, 40)
    if (typeof fields.brand === 'string' && fields.brand) clean.brand = fields.brand.slice(0, 60)
    if (['formal', 'business_casual', 'casual'].includes(fields.formality)) clean.formality = fields.formality
    if (['light', 'mid', 'warm', 'all'].includes(fields.warmth)) clean.warmth = fields.warmth
    return json({ fields: clean })
  } catch {
    return json({ error: 'parse_error', raw: text.slice(0, 300) }, 502)
  }
})
