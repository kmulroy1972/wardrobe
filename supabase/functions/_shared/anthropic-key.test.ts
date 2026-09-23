import { describe, expect, it, vi } from 'vitest'
import { resolveAnthropicKey } from './anthropic-key'

const request = (authorization = 'Bearer valid-token') =>
  new Request('https://example.test', { headers: { authorization } })

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

function dependencies(values: Record<string, string>, fetchImpl: typeof fetch) {
  return {
    env: (name: string) => values[name],
    fetch: fetchImpl,
  }
}

describe('resolveAnthropicKey', () => {
  it('rejects a request without a bearer token before making a network call', async () => {
    const fetchImpl = vi.fn()

    await expect(resolveAnthropicKey(request(''), dependencies({}, fetchImpl))).resolves.toEqual({
      error: 'unauthorized',
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects a bearer token that Supabase does not recognize', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, 401))

    const result = await resolveAnthropicKey(
      request(),
      dependencies({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon' }, fetchImpl),
    )

    expect(result).toEqual({ error: 'unauthorized' })
  })

  it('returns the shared environment key only after authenticating the caller', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ id: 'user-1' }))

    const result = await resolveAnthropicKey(
      request(),
      dependencies({
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'anon',
        ANTHROPIC_API_KEY: ' shared-key ',
      }, fetchImpl),
    )

    expect(result).toEqual({ key: 'shared-key' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('looks up a user-specific key with the caller session and user id', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ id: 'user+1' }))
      .mockResolvedValueOnce(response([{ anthropic_api_key: ' personal-key ' }]))

    const result = await resolveAnthropicKey(
      request(),
      dependencies({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon' }, fetchImpl),
    )

    expect(result).toEqual({ key: 'personal-key' })
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'https://project.supabase.co/rest/v1/private_settings?select=anthropic_api_key&user_id=eq.user%2B1&limit=1',
      { headers: { apikey: 'anon', Authorization: 'Bearer valid-token' } },
    )
  })

  it('does not fall back to another settings row when the caller has no key', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ id: 'user-1' }))
      .mockResolvedValueOnce(response([]))

    const result = await resolveAnthropicKey(
      request(),
      dependencies({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon' }, fetchImpl),
    )

    expect(result).toEqual({ error: 'not_configured' })
  })

  it('reports a settings lookup failure without exposing another user key', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ id: 'user-1' }))
      .mockResolvedValueOnce(response({}, 500))

    const result = await resolveAnthropicKey(
      request(),
      dependencies({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon' }, fetchImpl),
    )

    expect(result).toEqual({ error: 'lookup_failed' })
  })

  it('handles an unavailable auth service as a lookup failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network unavailable'))

    const result = await resolveAnthropicKey(
      request(),
      dependencies({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon' }, fetchImpl),
    )

    expect(result).toEqual({ error: 'lookup_failed' })
  })
})
