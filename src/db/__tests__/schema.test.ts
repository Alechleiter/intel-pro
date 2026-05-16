import { describe, it, expect } from 'vitest'
import { sites, chains, contacts, sourceRecords, imports } from '../schema'

describe('database schema', () => {
  it('sites table has all required columns', () => {
    const columns = Object.keys(sites)
    expect(columns).toContain('id')
    expect(columns).toContain('name')
    expect(columns).toContain('address')
    expect(columns).toContain('city')
    expect(columns).toContain('county')
    expect(columns).toContain('zip')
    expect(columns).toContain('lat')
    expect(columns).toContain('lng')
    expect(columns).toContain('vertical')
    expect(columns).toContain('subVertical')
    expect(columns).toContain('confidence')
    expect(columns).toContain('status')
    expect(columns).toContain('siteCount')
    expect(columns).toContain('chainId')
  })

  it('contacts supports both site-level and chain-level', () => {
    const columns = Object.keys(contacts)
    expect(columns).toContain('siteId')
    expect(columns).toContain('chainId')
  })

  it('source_records tracks provenance', () => {
    const columns = Object.keys(sourceRecords)
    expect(columns).toContain('sourceUrl')
    expect(columns).toContain('sourceDate')
    expect(columns).toContain('sourceName')
    expect(columns).toContain('rawData')
  })
})
