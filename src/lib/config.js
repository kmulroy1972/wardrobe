// Supabase project connection.
// The publishable key is safe to ship in client code — all data access is
// enforced by Row Level Security on the server.
export const SUPABASE_URL = 'https://emzuynfrgmfbetfvptlp.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_COldphdoLjF624krCsnwGw_qbU6dDDw'

export const CITIES = {
  dc: { key: 'dc', label: 'Washington, D.C.', short: 'D.C.', lat: 38.9072, lon: -77.0369 },
  howell: { key: 'howell', label: 'Howell, NJ', short: 'Howell', lat: 40.1698, lon: -74.2082 },
}
