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

function remapRecord(record: RawRecord, mapping: ColumnMapping): RawRecord {
  const remapped: RawRecord = { ...record }

  if (mapping.name) remapped['Premises Name'] = record[mapping.name]
  if (mapping.address) remapped['Premises Address'] = record[mapping.address]
  if (mapping.city) remapped['City'] = record[mapping.city]
  if (mapping.county) remapped['County'] = record[mapping.county]
  if (mapping.zip) remapped['Zip Code'] = record[mapping.zip]
  if (mapping.state) remapped['State'] = record[mapping.state]
  if (mapping.licenseType) remapped['License Type'] = record[mapping.licenseType]

  return remapped
}

function extractAddress(record: RawRecord, mapping?: ColumnMapping) {
  if (mapping) {
    return {
      name: val(record, mapping.name),
      address: val(record, mapping.address),
      city: val(record, mapping.city),
      county: val(record, mapping.county),
      zip: val(record, mapping.zip).slice(0, 5),
    }
  }
  return extractFallback(record)
}

function val(record: RawRecord, field: string): string {
  if (!field) return ''
  return String(record[field] || '').trim()
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
        const classifierRecord = columnMapping ? remapRecord(record, columnMapping) : record

        const classification =
          sourceType === 'ABC'
            ? classifyAbc(classifierRecord)
            : classifyGeneric(classifierRecord, sourceType as GenericSourceType)

        const addr = extractAddress(record, columnMapping)

        if (!addr.name) {
          errors.push(`Skipped row: no site name`)
          continue
        }

        const siteId = ulid()

        await db.insert(sites).values({
          id: siteId,
          name: addr.name,
          address: addr.address,
          city: addr.city,
          county: addr.county,
          zip: addr.zip,
          vertical: classification.vertical || 'other',
          subVertical: classification.subVertical || '',
          confidence: classification.confidence || 'low',
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

function extractFallback(record: RawRecord) {
  const tryFields = (...fields: string[]) => {
    for (const f of fields) {
      const v = record[f]
      if (v) return String(v).trim()
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
