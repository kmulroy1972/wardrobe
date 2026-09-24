import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../App', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('../lib/data', () => ({
  addWishlistItem: vi.fn(),
  askStylist: vi.fn(),
  getProfile: vi.fn(),
  listGarments: vi.fn(),
  listOutfits: vi.fn(),
  listWishlist: vi.fn(),
  saveOutfit: vi.fn(),
}))

vi.mock('../lib/weather', () => ({
  dayName: vi.fn(),
  fetchForecast: vi.fn(),
}))

import Stylist from './Stylist'

describe('Stylist', () => {
  it('makes ordinary wardrobe questions and exact-item context obvious', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/stylist']}>
        <Stylist />
      </MemoryRouter>,
    )

    expect(html).toContain('Ask the stylist')
    expect(html).toContain('Ask any wardrobe question')
    expect(html).toContain('Ask about a specific item')
    expect(html).toContain('Dinner with friends tomorrow')
    expect(html).toContain('Give me two different looks without a tie')
    expect(html).toContain('Nothing is saved or changed')
    expect(html).toContain('Open Build an outfit')
  })
})
