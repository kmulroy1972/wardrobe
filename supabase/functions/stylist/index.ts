// AI stylist: answers free-form wardrobe questions using the full catalog,
// saved outfits, shopping list, wear history, and both cities' weather.
// The Anthropic key comes from the authenticated user's private_settings row,
// with ANTHROPIC_API_KEY as a single-owner deployment fallback.

import { resolveAnthropicKey } from '../_shared/anthropic-key.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const keyResult = await resolveAnthropicKey(req)
  if ('error' in keyResult) {
    if (keyResult.error === 'unauthorized') return json({ error: 'unauthorized' }, 401)
    if (keyResult.error === 'lookup_failed') return json({ error: 'key_lookup_failed' }, 502)
    return json({ error: 'no_key' })
  }
  const key = keyResult.key

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  const { question, wardrobe = [], outfits = [], wishlist = [], weather, profile, history = [] } = payload
  if (!question || typeof question !== 'string') return json({ error: 'bad_request' }, 400)

  const system = `You are a discreet, expert personal stylist and valet for one client.

About the client:
- Height 4'5" with osteogenesis imperfecta; parts of the skeleton are non-typical, so off-the-rack fit varies.
- Uses a mobility scooter much of the day and also walks. Seated fit matters: trouser hems rise when seated, long coats catch on the scooter, and soft, stretchy fabrics are easier to dress in.
- Keeps two closets: "dc" (Washington, D.C. — the main working wardrobe including suits) and "howell" (Howell, NJ — a smaller dress-clothes reserve).
- Profile from the app: ${JSON.stringify(profile ?? {})}

Wardrobe catalog (JSON; each garment has an id, wear counts, and last_worn dates): ${JSON.stringify(wardrobe)}
Saved outfits the client already likes: ${JSON.stringify(outfits)}
Shopping list (gaps the client plans to fill): ${JSON.stringify(wishlist)}
Weather, 7-day, both cities: ${JSON.stringify(weather ?? 'not provided')}

Rules:
- Recommend ONLY garments from the catalog when composing outfits, and reference each one as [[id]] using its exact id — the app renders those as photo chips. Mention the garment name next to the reference naturally.
- Respect which closet the client will be dressing from; never mix closets in one outfit unless asked about moving or packing items.
- Factor in the weather and the occasion's dress code. Use wear history to favor pieces that haven't been worn lately, and mention when something is overdue for the rotation.
- You can also answer questions about packing lists, what to move between closets, laundry/tailor status, gaps worth buying (check the shopping list first), and which purchases would pair with the most existing pieces.
- Weave in seated-fit awareness where relevant, briefly and practically — never clinically.
- If the closet lacks what's needed, say so plainly and suggest what to look for when shopping (sizes often run boys' or short/extra-short).
- Keep replies short: a few sentences or a compact list. Warm, tailored, no fluff.`

  const messages = [
    ...history
      .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
      .slice(-10),
    { role: 'user', content: question },
  ]

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 1024, system, messages }),
  })

  if (!resp.ok) {
    const detail = await resp.text()
    return json({ error: 'anthropic_error', detail: detail.slice(0, 500) }, 502)
  }
  const data = await resp.json()
  const text = (data.content ?? [])
    .map((b: { type: string; text?: string }) => (b.type === 'text' ? b.text : ''))
    .join('')
  return json({ text })
})
