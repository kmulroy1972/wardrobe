import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  remove: vi.fn(),
  select: vi.fn(),
  storageFrom: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  },
}))

import { aiKeyIsSet, deleteGarment, removePhotos, saveOutfit } from './data'

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

  it('surfaces storage cleanup failures to callers that are rolling back uploads', async () => {
    mocks.remove.mockResolvedValue({ error: new Error('storage unavailable') })

    await expect(removePhotos(['/garments/user/photo.jpg'])).rejects.toThrow('storage unavailable')
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

    mocks.from.mockImplementation((table) => {
      if (table === 'outfit_items') return { insert: vi.fn().mockResolvedValue({ error: itemError }) }
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
})
