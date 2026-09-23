import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import OutfitBuilder from './OutfitBuilder'

describe('OutfitBuilder', () => {
  it('renders the recommendation request and action before the closet contents', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OutfitBuilder />
      </MemoryRouter>,
    )

    expect(html).toContain('Ask for recommendations')
    expect(html).toContain('Recommend outfits')
    expect(html.indexOf('Recommend outfits')).toBeLessThan(html.indexOf('Opening the closet'))
  })
})
