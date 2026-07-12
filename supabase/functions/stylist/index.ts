// AI stylist: answers free-form outfit questions using the wardrobe catalog.
// Requires an ANTHROPIC_API_KEY function secret; returns {error:'no_key'}
// until one is configured so the app can degrade gracefully.

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

  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) return json({ error: 'no_key' })

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  const { question, wardrobe = [], weather, profile, history = [] } = payload
  if (!question || typeof question !== 'string') return json({ error: 'bad_request' }, 400)

  const system = `You are a discreet, expert personal stylist and valet for one client.

About the client:
- Height 4'5" with osteogenesis imperfecta; parts of the skeleton are non-typical, so off-the-rack fit varies.
- Uses a mobility scooter much of the day and also walks. Seated fit matters: trouser hems rise when seated, long coats catch on the scooter, and soft, stretchy fabrics are easier to dress in.
- Keeps two closets: "dc" (Washington, D.C. — the main working wardrobe including suits) and "howell" (Howell, NJ — a smaller dress-clothes reserve).
- Profile from the app: ${JSON.stringify(profile ?? {})}

Wardrobe catalog (JSON; each item has an id): ${JSON.stringify(wardrobe)}
Weather context: ${JSON.stringify(weather ?? 'not provided')}

Rules:
- Recommend ONLY garments from the catalog when composing outfits, and reference each one as [[id]] using its exact id — the app renders those as photo chips. Mention the garment name next to the reference naturally.
- Respect which closet the client will be dressing from; never mix closets in one outfit unless asked about moving items.
- Factor in the weather when it's provided, and the occasion's dress code.
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
