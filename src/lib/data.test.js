import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: { from: mocks.from },
}))

import { aiKeyIsSet } from './data'

describe('aiKeyIsSet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null })
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle })
    mocks.select.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockReturnValue({ select: mocks.select })
  })

  it('checks for a settings row without returning API-key material to the browser', async () => {
    await expect(aiKeyIsSet('user-1')).resolves.toBe(true)

    expect(mocks.from).toHaveBeenCalledWith('private_settings')
    expect(mocks.select).toHaveBeenCalledWith('user_id')
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('returns false when no settings row exists', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(aiKeyIsSet('user-1')).resolves.toBe(false)
  })
})
