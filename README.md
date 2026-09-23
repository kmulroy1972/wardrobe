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
nvm use          # Node 22 (see .nvmrc)
npm ci
npm test
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

Pull requests run tests, the production build, and a high-severity dependency
audit in GitHub Actions.

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
`garments/<user-id>/<uuid>.jpg`. The read-only live schema and policy inventory
captured during project re-entry is in
[`docs/supabase-live-baseline.md`](docs/supabase-live-baseline.md).

## AI stylist chat (optional, one-time setup)

Rule-based outfit recommendations work with no configuration. Free-form chat
uses the `stylist` edge function, which calls the Claude API:

1. Create an API key at console.anthropic.com.
2. Paste it on the Profile page. The row is protected by user-scoped RLS and
   the browser only checks whether the row exists; it does not read the key.

For a single-owner deployment, `ANTHROPIC_API_KEY` can instead be configured as
an Edge Function secret. Both AI functions authenticate the Supabase bearer
token before using either key source, and a stored user key is queried only for
that authenticated user. The user-specific key takes precedence over the shared
fallback.

Until then the chat answers with a friendly setup reminder.

## Privacy notes

- One account is expected. The live project currently blocks new signups with
  an auth trigger; verify that protection before changing authentication.
- Garment photos are served from a public-read bucket at unguessable URLs;
  catalog data itself is only readable by your account. Moving photos to a
  private bucket with signed URLs is a future privacy hardening task and must be
  planned before changing existing object URLs.
