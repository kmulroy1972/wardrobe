# Ward&Robe

Private wardrobe manager for one person: a photo catalog of every garment across
two closets (Washington, D.C. and Howell, NJ), weather-aware outfit
recommendations tuned to osteogenesis imperfecta / seated-fit needs, a 7-day
forecast for both cities, a flat-lay outfit builder, and an optional AI stylist
chat powered by Claude.

## Stack

- **Front end** — Vite + React 19, hash routing, single stylesheet design system
  ("tailor's ledger": flannel/bottle-green/brass, Marcellus + Archivo).
- **Back end** — Supabase project `emzuynfrgmfbetfvptlp` (us-east-1):
  Postgres with RLS on every table, Storage bucket `garments` (public read,
  owner-scoped writes), email/password auth, edge function `stylist`.
- **Weather** — Open-Meteo (no key required).
- **Hosting** — Vercel.

## Local development

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

The Supabase URL and publishable key live in `src/lib/config.js`. The
publishable key is safe in client code; Row Level Security enforces all access.

## Data model

- `garments` — one row per piece: category, brand, size, color, pattern,
  material, closet location (`dc`/`howell`), dress code, weight, status
  (in closet / laundry / tailor / stored), photo URL, notes, fit notes,
  wear tracking.
- `outfits` + `outfit_items` — saved looks referencing garments by slot.
- `profiles` — measurements, sizes, and the fit notes the stylist reads.

All tables use `auth.uid()` RLS policies; photos upload to
`garments/<user-id>/<uuid>.jpg`.

## AI stylist chat (optional, one-time setup)

Rule-based outfit recommendations work with no configuration. Free-form chat
uses the `stylist` edge function, which calls the Claude API:

1. Create an API key at console.anthropic.com.
2. Supabase dashboard → Edge Functions → `stylist` → Secrets →
   add `ANTHROPIC_API_KEY`.

Until then the chat answers with a friendly setup reminder.

## Privacy notes

- One account is expected. After creating yours, you can disable new signups in
  Supabase → Authentication → Sign In / Up.
- Garment photos are served from a public-read bucket at unguessable URLs;
  catalog data itself is only readable by your account.
