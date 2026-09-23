type Dependencies = {
  env: (name: string) => string | undefined
  fetch: typeof fetch
}

type KeyResult =
  | { key: string }
  | { error: 'unauthorized' | 'not_configured' | 'lookup_failed' }

const defaults: Dependencies = {
  env: (name) => Deno.env.get(name),
  fetch,
}

const LOOKUP_TIMEOUT_MS = 8_000

export async function resolveAnthropicKey(
  req: Request,
  dependencies: Dependencies = defaults,
): Promise<KeyResult> {
  const authorization = req.headers.get('authorization') || ''
  if (!/^Bearer\s+\S+$/i.test(authorization)) return { error: 'unauthorized' }

  const url = dependencies.env('SUPABASE_URL')
  const anonKey = dependencies.env('SUPABASE_ANON_KEY')
  if (!url || !anonKey) return { error: 'not_configured' }

  let authResponse: Response
  try {
    authResponse = await dependencies.fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    })
  } catch {
    return { error: 'lookup_failed' }
  }
  if (!authResponse.ok) return { error: 'unauthorized' }

  const user = await authResponse.json().catch(() => null)
  if (!user?.id || typeof user.id !== 'string') return { error: 'unauthorized' }

  const settingsUrl =
    `${url}/rest/v1/private_settings?select=anthropic_api_key` +
    `&user_id=eq.${encodeURIComponent(user.id)}&limit=1`
  let settingsResponse: Response
  try {
    settingsResponse = await dependencies.fetch(settingsUrl, {
      headers: { apikey: anonKey, Authorization: authorization },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    })
  } catch {
    return { error: 'lookup_failed' }
  }
  if (!settingsResponse.ok) return { error: 'lookup_failed' }

  const rows = await settingsResponse.json().catch(() => null)
  const key = rows?.[0]?.anthropic_api_key
  if (typeof key === 'string' && key.trim()) return { key: key.trim() }

  const sharedKey = dependencies.env('ANTHROPIC_API_KEY')?.trim()
  return sharedKey ? { key: sharedKey } : { error: 'not_configured' }
}
