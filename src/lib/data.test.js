import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  remove: vi.fn(),
  select: vi.fn(),
  signOut: vi.fn(),
  storageFrom: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser, signOut: mocks.signOut },
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  },
}))

import { aiKeyIsSet, deleteGarment, getProfile, reconcileFailedGarmentSave, removePhotos, saveOutfit } from './data'

describe('getProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle })
    mocks.select.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockReturnValue({ select: mocks.select })
  })

  it('returns local defaults without writing when the Stylist requests a read-only snapshot', async () => {
    await expect(getProfile('user-1', { createIfMissing: false })).resolves.toMatchObject({
      user_id: 'user-1',
      sizes: {},
    })

    expect(mocks.from).toHaveBeenCalledTimes(1)
    expect(mocks.from).toHaveBeenCalledWith('profiles')
    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('preserves profile creation for the explicit Profile workflow', async () => {
    const created = { user_id: 'user-1', fit_notes: 'Saved defaults', sizes: {} }
    const single = vi.fn().mockResolvedValue({ data: created, error: null })
    mocks.getUser.mockResolvedValue({ error: null })
    mocks.upsert.mockReturnValue({ select: () => ({ single }) })
    mocks.from.mockReturnValue({ select: mocks.select, upsert: mocks.upsert })

    await expect(getProfile('user-1')).resolves.toEqual(created)

    expect(mocks.getUser).toHaveBeenCalledTimes(1)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1' }), { onConflict: 'user_id' })
  })
})

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

describe('garment photo integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.storageFrom.mockReturnValue({ remove: mocks.remove })
    mocks.remove.mockResolvedValue({ error: null })
  })

  it('deletes the database row before removing its photos', async () => {
    const deleteEq = vi.fn().mockResolvedValue({ error: null })
    mocks.from.mockReturnValue({ delete: () => ({ eq: deleteEq }) })

    await deleteGarment({
      id: 'garment-1',
      photo_url: 'https://project.supabase.co/storage/v1/object/public/garments/user/cover.jpg',
      photos: ['https://project.supabase.co/storage/v1/object/public/garments/user/detail.jpg'],
    })

    expect(deleteEq).toHaveBeenCalledWith('id', 'garment-1')
    expect(mocks.remove).toHaveBeenCalledWith(['user/cover.jpg', 'user/detail.jpg'])
    expect(deleteEq.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0])
  })

  it('keeps stored photos when the database delete is rejected', async () => {
    const error = new Error('garment is used by an outfit')
    mocks.from.mockReturnValue({ delete: () => ({ eq: vi.fn().mockResolvedValue({ error }) }) })

    await expect(deleteGarment({ id: 'garment-1', photo_url: '/garments/user/cover.jpg' }))
      .rejects.toThrow('garment is used by an outfit')
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('keeps a successful row deletion successful when photo cleanup fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.from.mockReturnValue({
      delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })
    mocks.remove.mockResolvedValue({ error: new Error('storage unavailable') })

    await expect(deleteGarment({ id: 'garment-1', photo_url: '/garments/user/cover.jpg' }))
      .resolves.toBeUndefined()
    expect(warning).toHaveBeenCalledWith(
      'Garment deleted, but its stored photos could not be removed.',
      expect.any(Error),
    )
    warning.mockRestore()
  })

  it('surfaces storage cleanup failures to callers that are rolling back uploads', async () => {
    mocks.remove.mockResolvedValue({ error: new Error('storage unavailable') })

    await expect(removePhotos(['/garments/user/photo.jpg'])).rejects.toThrow('storage unavailable')
  })

  it('preserves uploads that a committed garment row references', async () => {
    const committed = {
      id: 'garment-1',
      photo_url: '/garments/user/cover.jpg',
      photos: ['/garments/user/detail.jpg'],
    }
    const maybeSingle = vi.fn().mockResolvedValue({ data: committed, error: null })
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    })

    await expect(reconcileFailedGarmentSave('garment-1', [
      '/garments/user/cover.jpg',
      '/garments/user/detail.jpg',
    ])).resolves.toEqual(committed)
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('removes only uploads confirmed to be unreferenced', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'garment-1', photo_url: '/garments/user/cover.jpg', photos: [] },
      error: null,
    })
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    })

    await expect(reconcileFailedGarmentSave('garment-1', [
      '/garments/user/cover.jpg',
      '/garments/user/orphan.jpg',
    ])).resolves.toBeNull()
    expect(mocks.remove).toHaveBeenCalledWith(['user/orphan.jpg'])
  })

  it('preserves uploads when reconciliation also fails', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('network unavailable') })
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    })

    await expect(reconcileFailedGarmentSave('garment-1', ['/garments/user/photo.jpg']))
      .resolves.toBeNull()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})

describe('saveOutfit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes the outfit header when inserting its items fails', async () => {
    const itemError = new Error('item insert failed')
    const cleanupEq = vi.fn().mockResolvedValue({ error: null })
    let outfitCalls = 0

    let itemCalls = 0
    mocks.from.mockImplementation((table) => {
      if (table === 'outfit_items' && itemCalls++ === 0) {
        return { insert: vi.fn().mockResolvedValue({ error: itemError }) }
      }
      if (table === 'outfit_items') {
        return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
      }
      if (table === 'outfits' && outfitCalls++ === 0) {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'outfit-1' }, error: null }),
            }),
          }),
        }
      }
      return { delete: () => ({ eq: cleanupEq }) }
    })

    await expect(saveOutfit({
      name: 'Test outfit',
      occasion: 'casual',
      location: 'dc',
      notes: '',
      items: [{ slot: 'top', g: { id: 'garment-1' } }],
    })).rejects.toThrow('item insert failed')

    expect(cleanupEq).toHaveBeenCalledWith('id', 'outfit-1')
  })

  it('accepts an outfit item insert that committed before its response was lost', async () => {
    const itemError = new Error('response lost')
    let outfitCalls = 0
    let itemCalls = 0

    mocks.from.mockImplementation((table) => {
      if (table === 'outfit_items' && itemCalls++ === 0) {
        return { insert: vi.fn().mockResolvedValue({ error: itemError }) }
      }
      if (table === 'outfit_items') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ garment_id: 'garment-1', slot: 'top', position: 0 }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'outfits' && outfitCalls++ === 0) {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'outfit-1' }, error: null }),
            }),
          }),
        }
      }
      throw new Error('outfit header must not be deleted')
    })

    await expect(saveOutfit({
      name: 'Recovered outfit',
      occasion: 'casual',
      location: 'dc',
      notes: '',
      items: [{ slot: 'top', g: { id: 'garment-1' } }],
    })).resolves.toEqual({ id: 'outfit-1' })
  })

  it('preserves the outfit header when verification is ambiguous', async () => {
    const itemError = new Error('response lost')
    let outfitCalls = 0
    let itemCalls = 0

    mocks.from.mockImplementation((table) => {
      if (table === 'outfit_items' && itemCalls++ === 0) {
        return { insert: vi.fn().mockResolvedValue({ error: itemError }) }
      }
      if (table === 'outfit_items') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: new Error('verification unavailable') }),
          }),
        }
      }
      if (table === 'outfits' && outfitCalls++ === 0) {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'outfit-1' }, error: null }),
            }),
          }),
        }
      }
      throw new Error('outfit header must not be deleted')
    })

    await expect(saveOutfit({
      name: 'Ambiguous outfit',
      occasion: 'casual',
      location: 'dc',
      notes: '',
      items: [{ slot: 'top', g: { id: 'garment-1' } }],
    })).rejects.toThrow('response lost')
  })

  it('reports both the item and cleanup errors when compensation fails', async () => {
    const itemError = new Error('item insert failed')
    const cleanupError = new Error('cleanup failed')
    let outfitCalls = 0
    let itemCalls = 0

    mocks.from.mockImplementation((table) => {
      if (table === 'outfit_items' && itemCalls++ === 0) {
        return { insert: vi.fn().mockResolvedValue({ error: itemError }) }
      }
      if (table === 'outfit_items') {
        return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
      }
      if (table === 'outfits' && outfitCalls++ === 0) {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'outfit-1' }, error: null }),
            }),
          }),
        }
      }
      return { delete: () => ({ eq: vi.fn().mockResolvedValue({ error: cleanupError }) }) }
    })

    await expect(saveOutfit({
      name: 'Test outfit',
      occasion: 'casual',
      location: 'dc',
      notes: '',
      items: [{ slot: 'top', g: { id: 'garment-1' } }],
    })).rejects.toThrow('item insert failed; cleanup also failed: cleanup failed')
  })
})
