import { ulid } from 'ulid'
import { db } from '@/db'
import { sites, sourceRecords, imports } from '@/db/schema'
import { classifyAbc } from '../classifiers/abc'
import { classifyGeneric } from '../classifiers/generic'
import type { GenericSourceType } from '../classifiers/generic'
import { parseCsvText, detectSourceType } from './parse-csv'
import type { RawRecord } from '../classifiers/types'
import type { SourceType } from './parse-csv'

export interface ImportResult {
  importId: string
  totalRecords: number
  classified: number
  needsReview: number
  errors: string[]
}

function extractAddress(record: RawRecord, sourceType: SourceType) {
  switch (sourceType) {
    case 'ABC':
      return {
        name: String(record['Premises Name'] || ''),
        address: String(record['Premises Address'] || record['Address'] || ''),
        city: String(record['City'] || ''),
        county: String(record['County'] || ''),
        zip: String(record['Zip Code'] || record['Zip'] || ''),
      }
    case 'CalHHS':
    case 'RCFE':
      return {
        name: String(record['FACILITY NAME'] || record['Facility Name'] || ''),
        address: String(record['ADDRESS'] || record['Address'] || ''),
        city: String(record['CITY'] || record['City'] || ''),
        county: String(record['COUNTY'] || record['County'] || ''),
        zip: String(record['ZIP'] || record['Zip'] || ''),
      }
    case 'CDE_PUBLIC':
    case 'CDE_PRIVATE':
      return {
        name: String(record['School'] || record['SchoolName'] || ''),
        address: String(record['Street'] || record['Address'] || ''),
        city: String(record['City'] || ''),
        county: String(record['County'] || ''),
        zip: String(record['Zip'] || record['ZipCode'] || ''),
      }
    case 'SNAP':
      return {
        name: String(record['SNAP Store Name'] || record['Store Name'] || ''),
        address: String(record['Address'] || ''),
        city: String(record['City'] || ''),
        county: String(record['County'] || ''),
        zip: String(record['Zip'] || record['Zip Code'] || ''),
      }
    default:
      return {
        name: String(record['Name'] || record['name'] || record['FACILITY NAME'] || ''),
        address: String(record['Address'] || record['address'] || record['ADDRESS'] || ''),
        city: String(record['City'] || record['city'] || record['CITY'] || ''),
        county: String(record['County'] || record['county'] || record['COUNTY'] || ''),
        zip: String(record['Zip'] || record['zip'] || record['ZIP'] || record['Zip Code'] || ''),
      }
  }
}

export async function importCsv(
  csvText: string,
  fileName: string,
  importedBy: string,
  sourceOverride?: SourceType,
): Promise<ImportResult> {
  const records = parseCsvText(csvText)
  if (records.length === 0) {
    return { importId: '', totalRecords: 0, classified: 0, needsReview: 0, errors: ['No records found in CSV'] }
  }

  const headers = Object.keys(records[0])
  const sourceType = sourceOverride || detectSourceType(headers)
  const importId = ulid()
  const errors: string[] = []
  let classified = 0
  let needsReview = 0

  await db.insert(imports).values({
    id: importId,
    sourceName: sourceType,
    fileName,
    recordCount: records.length,
    importedBy,
  })

  for (const record of records) {
    try {
      const classification =
        sourceType === 'ABC'
          ? classifyAbc(record)
          : classifyGeneric(record, sourceType as GenericSourceType)

      const addr = extractAddress(record, sourceType)
      const siteId = ulid()

      await db.insert(sites).values({
        id: siteId,
        name: addr.name,
        address: addr.address,
        city: addr.city,
        county: addr.county,
        zip: addr.zip.slice(0, 5),
        vertical: classification.vertical,
        subVertical: classification.subVertical,
        confidence: classification.confidence,
        status: classification.needsReview ? 'needs_review' : 'active',
      })

      await db.insert(sourceRecords).values({
        id: ulid(),
        siteId,
        sourceName: sourceType,
        sourceRecordId: String(record['License Number'] || record['FACID'] || record['CDSCode'] || ''),
        rawData: JSON.stringify(record),
      })

      classified++
      if (classification.needsReview) needsReview++
    } catch (err) {
      errors.push(`Row error: ${(err as Error).message}`)
    }
  }

  return { importId, totalRecords: records.length, classified, needsReview, errors }
}
