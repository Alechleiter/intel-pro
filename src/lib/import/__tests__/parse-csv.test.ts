import { describe, it, expect } from 'vitest'
import { parseCsvText, detectSourceType } from '../parse-csv'

describe('CSV parser', () => {
  it('parses CSV text into records', () => {
    const csv = `Name,Address,City\nJoes Diner,123 Main St,Los Angeles\nBob Cafe,456 Oak Ave,San Diego`
    const records = parseCsvText(csv)
    expect(records).toHaveLength(2)
    expect(records[0]['Name']).toBe('Joes Diner')
    expect(records[1]['City']).toBe('San Diego')
  })

  it('handles extra whitespace in headers', () => {
    const csv = ` Name , Address , City \nTest,123 St,LA`
    const records = parseCsvText(csv)
    expect(records[0]['Name']).toBe('Test')
  })

  it('skips empty lines', () => {
    const csv = `Name,City\nA,LA\n\nB,SF\n\n`
    const records = parseCsvText(csv)
    expect(records).toHaveLength(2)
  })

  it('detects ABC source by License Type column', () => {
    expect(detectSourceType(['License Type', 'Premises Name', 'Status'])).toBe('ABC')
  })

  it('detects CalHHS source by FACID column', () => {
    expect(detectSourceType(['FACID', 'FACILITY NAME', 'LICENSE TYPE'])).toBe('CalHHS')
  })

  it('detects CDE source by CDSCode column', () => {
    expect(detectSourceType(['CDSCode', 'School', 'District'])).toBe('CDE_PUBLIC')
  })

  it('detects SNAP source', () => {
    expect(detectSourceType(['SNAP Store Name', 'Address', 'City'])).toBe('SNAP')
  })

  it('returns UNKNOWN for unrecognized columns', () => {
    expect(detectSourceType(['Foo', 'Bar', 'Baz'])).toBe('UNKNOWN')
  })
})
