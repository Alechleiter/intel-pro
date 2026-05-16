import { NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { db } from '@/db'
import { sites, sourceRecords } from '@/db/schema'
import { classifyAbc } from '@/lib/classifiers/abc'
import { classifyGeneric } from '@/lib/classifiers/generic'
import type { GenericSourceType } from '@/lib/classifiers/generic'
import type { RawRecord } from '@/lib/classifiers/types'
import type { SourceType } from '@/lib/import/parse-csv'

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

export async function POST(request: NextRequest) {
  try {
    const { records, sourceType, importId } = await request.json() as {
      records: RawRecord[]
      sourceType: SourceType
      importId: string
    }

    let classified = 0
    let needsReview = 0
    const errors: string[] = []

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

    return NextResponse.json({ classified, needsReview, errors: errors.slice(0, 5) })
  } catch (err) {
    console.error('Batch import error:', err)
    return NextResponse.json(
      { error: `Batch import failed: ${(err as Error).message}` },
      { status: 500 },
    )
  }
}
