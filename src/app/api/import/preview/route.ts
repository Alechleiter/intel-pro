import { NextRequest, NextResponse } from 'next/server'
import { parseCsvText, detectSourceType } from '@/lib/import/parse-csv'
import type { SourceType } from '@/lib/import/parse-csv'
import { classifyAbc } from '@/lib/classifiers/abc'
import { classifyGeneric } from '@/lib/classifiers/generic'
import type { GenericSourceType } from '@/lib/classifiers/generic'
import type { RawRecord } from '@/lib/classifiers/types'

function extractPreviewAddress(record: RawRecord, sourceType: SourceType) {
  switch (sourceType) {
    case 'ABC':
      return {
        name: String(record['Premises Name'] || ''),
        address: String(record['Premises Address'] || record['Address'] || ''),
        city: String(record['City'] || ''),
        zip: String(record['Zip Code'] || record['Zip'] || ''),
      }
    case 'CalHHS':
    case 'RCFE':
      return {
        name: String(record['FACILITY NAME'] || record['Facility Name'] || ''),
        address: String(record['ADDRESS'] || record['Address'] || ''),
        city: String(record['CITY'] || record['City'] || ''),
        zip: String(record['ZIP'] || record['Zip'] || ''),
      }
    case 'CDE_PUBLIC':
    case 'CDE_PRIVATE':
      return {
        name: String(record['School'] || record['SchoolName'] || ''),
        address: String(record['Street'] || record['Address'] || ''),
        city: String(record['City'] || ''),
        zip: String(record['Zip'] || record['ZipCode'] || ''),
      }
    case 'SNAP':
      return {
        name: String(record['SNAP Store Name'] || record['Store Name'] || ''),
        address: String(record['Address'] || ''),
        city: String(record['City'] || ''),
        zip: String(record['Zip'] || record['Zip Code'] || ''),
      }
    default:
      return {
        name: String(record['Name'] || record['name'] || record['FACILITY NAME'] || ''),
        address: String(record['Address'] || record['address'] || record['ADDRESS'] || ''),
        city: String(record['City'] || record['city'] || record['CITY'] || ''),
        zip: String(record['Zip'] || record['zip'] || record['ZIP'] || record['Zip Code'] || ''),
      }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { csvText, sourceOverride } = body as {
      csvText: string
      sourceOverride?: string
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json(
        { error: 'No CSV text provided' },
        { status: 400 },
      )
    }

    const records = parseCsvText(csvText)
    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No records found in CSV' },
        { status: 400 },
      )
    }

    const headers = Object.keys(records[0])
    const sourceType: SourceType =
      sourceOverride && sourceOverride !== 'auto'
        ? (sourceOverride as SourceType)
        : detectSourceType(headers)

    const previewRows = records.slice(0, 20).map((record) => {
      try {
        const classification =
          sourceType === 'ABC'
            ? classifyAbc(record)
            : sourceType === 'UNKNOWN'
              ? {
                  vertical: 'other' as const,
                  subVertical: 'unknown',
                  confidence: 'low' as const,
                  needsReview: true,
                  reasons: ['Unknown source type'],
                }
              : classifyGeneric(record, sourceType as GenericSourceType)

        const addr = extractPreviewAddress(record, sourceType)

        return {
          name: addr.name,
          address: addr.address,
          city: addr.city,
          zip: addr.zip.slice(0, 5),
          vertical: classification.vertical,
          subVertical: classification.subVertical,
          confidence: classification.confidence,
          status: classification.needsReview ? 'needs_review' : 'active',
        }
      } catch {
        return {
          name: 'Error',
          address: '',
          city: '',
          zip: '',
          vertical: 'other',
          subVertical: '',
          confidence: 'low',
          status: 'needs_review',
        }
      }
    })

    return NextResponse.json({
      sourceType,
      totalRecords: records.length,
      previewRows,
    })
  } catch (err) {
    console.error('Preview error:', err)
    return NextResponse.json(
      { error: `Preview failed: ${(err as Error).message}` },
      { status: 500 },
    )
  }
}
