import Papa from 'papaparse'
import type { RawRecord } from '../classifiers/types'

export function parseCsvText(csvText: string): RawRecord[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })
  return result.data as RawRecord[]
}

export type SourceType = 'ABC' | 'CalHHS' | 'RCFE' | 'CDE_PUBLIC' | 'CDE_PRIVATE' | 'SNAP' | 'LIHTC' | 'HUD' | 'PHA' | 'UNKNOWN'

const SOURCE_SIGNATURES: Record<string, SourceType> = {
  'License Type': 'ABC',
  'FACID': 'CalHHS',
  'CDSCode': 'CDE_PUBLIC',
  'SNAP Store Name': 'SNAP',
  'HUD Property Name': 'HUD',
  'Project Name': 'LIHTC',
}

export function detectSourceType(headers: string[]): SourceType {
  for (const header of headers) {
    const trimmed = header.trim()
    if (SOURCE_SIGNATURES[trimmed]) {
      return SOURCE_SIGNATURES[trimmed]
    }
  }
  return 'UNKNOWN'
}
