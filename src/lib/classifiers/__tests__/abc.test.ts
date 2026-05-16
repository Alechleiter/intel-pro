import { describe, it, expect } from 'vitest'
import { classifyAbc } from '../abc'

describe('ABC license classifier', () => {
  it('classifies type 47 as restaurant with high confidence when name matches', () => {
    const result = classifyAbc({
      'License Type': '47',
      'Premises Name': 'OLIVE GARDEN ITALIAN RESTAURANT',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('restaurant')
    expect(result.confidence).toBe('high')
    expect(result.needsReview).toBe(false)
  })

  it('classifies type 48 as bar', () => {
    const result = classifyAbc({
      'License Type': '48',
      'Premises Name': 'THE TIPSY PUB',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('bar')
  })

  it('classifies type 75 as brewpub', () => {
    const result = classifyAbc({
      'License Type': '75',
      'Premises Name': 'STONE BREWING',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('bar')
    expect(result.subVertical).toBe('brewpub')
  })

  it('classifies type 20 as grocery/market', () => {
    const result = classifyAbc({
      'License Type': '20',
      'Premises Name': 'TRADER JOES #123',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('grocery')
  })

  it('classifies type 21 as liquor store', () => {
    const result = classifyAbc({
      'License Type': '21',
      'Premises Name': 'BEVMO #45',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('liquor')
  })

  it('classifies type 67 as hotel', () => {
    const result = classifyAbc({
      'License Type': '67',
      'Premises Name': 'HILTON GARDEN INN',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('hotel')
    expect(result.confidence).toBe('high')
  })

  it('marks ambiguous names as medium confidence', () => {
    const result = classifyAbc({
      'License Type': '47',
      'Premises Name': 'ABC LLC',
      'Status': 'ACTIVE',
    })
    expect(result.confidence).toBe('medium')
  })

  it('marks type 47 with hotel name as needs_review', () => {
    const result = classifyAbc({
      'License Type': '47',
      'Premises Name': 'MARRIOTT HOTEL RESTAURANT',
      'Status': 'ACTIVE',
    })
    expect(result.needsReview).toBe(true)
  })

  it('returns other for unknown license types', () => {
    const result = classifyAbc({
      'License Type': '99',
      'Premises Name': 'MYSTERY PLACE',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('other')
    expect(result.confidence).toBe('low')
    expect(result.needsReview).toBe(true)
  })
})
