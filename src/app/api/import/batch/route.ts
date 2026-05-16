import { NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { db } from '@/db'
import { sites, sourceRecords } from '@/db/schema'
import { classifyAbc } from '@/lib/classifiers/abc'
import { classifyGeneric } from '@/lib/classifiers/generic'
import type { GenericSourceType } from '@/lib/classifiers/generic'
import type { RawRecord } from '@/lib/classifiers/types'
import type { SourceType } from '@/lib/import/parse-csv'

interface ColumnMapping {
  name: string
  address: string
  city: string
  county: string
  zip: string
  state: string
  licenseType: string
  vertical: string
}

function extractWithMapping(record: RawRecord, mapping: ColumnMapping) {
  return {
    name: String(record[mapping.name] || '').trim(),
    address: mapping.address ? String(record[mapping.address] || '').trim() : '',
    city: mapping.city ? String(record[mapping.city] || '').trim() : '',
    county: mapping.county ? String(record[mapping.county] || '').trim() : '',
    zip: mapping.zip ? String(record[mapping.zip] || '').trim().slice(0, 5) : '',
  }
}

export async function POST(request: NextRequest) {
  try {
    const { records, sourceType, importId, columnMapping } = await request.json() as {
      records: RawRecord[]
      sourceType: SourceType
      importId: string
      columnMapping?: ColumnMapping
    }

    let classified = 0
    let needsReview = 0
    const errors: string[] = []

    for (const record of records) {
      try {
        // If we have a column mapping, remap the record to standard field names for the classifier
        let classifierRecord = record
        if (columnMapping?.licenseType) {
          classifierRecord = {
            ...record,
            'License Type': record[columnMapping.licenseType],
            'Premises Name': record[columnMapping.name],
          }
        }

        const classification =
          sourceType === 'ABC'
            ? classifyAbc(classifierRecord)
            : classifyGeneric(classifierRecord, sourceType as GenericSourceType)

        // Extract address using mapping if provided, otherwise fall back to old logic
        const addr = columnMapping
          ? extractWithMapping(record, columnMapping)
          : extractFallback(record, sourceType)

        const siteId = ulid()

        await db.insert(sites).values({
          id: siteId,
          name: addr.name,
          address: addr.address,
          city: addr.city,
          county: addr.county,
          zip: addr.zip,
          vertical: classification.vertical,
          subVertical: classification.subVertical,
          confidence: classification.confidence,
          status: classification.needsReview ? 'needs_review' : 'active',
        })

        await db.insert(sourceRecords).values({
          id: ulid(),
          siteId,
          sourceName: sourceType,
          sourceRecordId: String(
            record[columnMapping?.licenseType || 'License Number'] ||
            record['FACID'] || record['CDSCode'] || ''
          ),
          rawData: JSON.stringify(record),
        })

        classified++
        if (classification.needsReview) needsReview++
      } catch (err) {
        errors.push(`Row error: ${(err as Error).message}`)
      }
    }

    return NextResponse.json({ classified, needsReview, errors: errors.slice(0, 5) })
  } catch (err) {
    console.error('Batch import error:', err)
    return NextResponse.json(
      { error: `Batch import failed: ${(err as Error).message}` },
      { status: 500 },
    )
  }
}

function extractFallback(record: RawRecord, sourceType: SourceType) {
  const tryFields = (...fields: string[]) => {
    for (const f of fields) {
      const val = record[f]
      if (val) return String(val).trim()
    }
    return ''
  }

  return {
    name: tryFields('Premises Name', 'FACILITY NAME', 'Facility Name', 'Name', 'name', 'School', 'Store Name', 'SNAP Store Name', 'BUS_NAME', 'DBA_NAME'),
    address: tryFields('Premises Address', 'ADDRESS', 'Address', 'address', 'Street', 'PREM_ADDR'),
    city: tryFields('City', 'CITY', 'city', 'PREM_CITY'),
    county: tryFields('County', 'COUNTY', 'county', 'CNTY'),
    zip: tryFields('Zip Code', 'ZIP', 'Zip', 'zip', 'ZipCode', 'PREM_ZIP', 'Postal Code').slice(0, 5),
  }
}
