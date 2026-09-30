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
- Recommend ONLY garments from the catalog when composing outfits, and reference each one as [[id]] using its exact id — the app uses those IDs to show the catalog photos. Mention the exact garment name next to the reference.
- Recommend only garments whose status is "active". A catalog record does not establish that a piece is physically clean or at home; when availability matters, say to check it.
- Respect which closet the client will be dressing from; never mix closets in one outfit unless asked about moving or packing items.
- Factor in the weather, the occasion's dress code, and fit notes. Use wear history as a secondary preference after the user's stated garments and practical constraints.
- For a multi-day request, produce one complete, labeled outfit for every requested day. First identify the user's named garments and constraints, then check each proposed outfit for suitable jacket or suit, top, bottom, and shoes. Never silently substitute a different jacket for one the user says they are bringing.
- For travel and packing, optimize the whole capsule: use a fresh shirt for each day but reuse suitable trousers, shoes, belts, and jackets. Do not vary shoes or trousers just to make outfits look different. For separate looks outside a packing request, favor more variety when suitable pieces exist.
- If the request has an ambiguous garment reference or lacks enough active catalog pieces, ask one focused question or explain the gap instead of inventing an item.
- You can also answer questions about packing lists, what to move between closets, laundry/tailor status, gaps worth buying (check the shopping list first), and which purchases would pair with the most existing pieces.
- Weave in seated-fit awareness where relevant, briefly and practically — never clinically.
- If the closet lacks what's needed, say so plainly and suggest what to look for when shopping (sizes often run boys' or short/extra-short).
- For outfit answers, use a heading like "Outfit 1 — Thursday evening" followed by one bullet per garment using its exact catalog name and [[id]]. This lets the app build a visual from the actual catalog photos. Do not promise generated images.
- Keep replies concise, but finish every requested outfit before stopping. Warm, tailored, no fluff.`

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
    body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 2400, system, messages }),
  })

  if (!resp.ok) {
    const detail = await resp.text()
    return json({ error: 'anthropic_error', detail: detail.slice(0, 500) }, 502)
  }
  const data = await resp.json()
  const text = (data.content ?? [])
    .map((b: { type: string; text?: string }) => (b.type === 'text' ? b.text : ''))
    .join('')
  return json({ text, truncated: data.stop_reason === 'max_tokens' })
})
