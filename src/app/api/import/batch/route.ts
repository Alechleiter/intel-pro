import { NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { db } from '@/db'
import { sites, sourceRecords } from '@/db/schema'
import { classifyAbc } from '@/lib/classifiers/abc'
import { classifyGeneric } from '@/lib/classifiers/generic'
import type { GenericSourceType } from '@/lib/classifiers/generic'
import type { RawRecord } from '@/lib/classifiers/types'
import type { SourceType } from '@/lib/import/parse-csv'
import { eq, and, sql } from 'drizzle-orm'

interface ColumnMapping {
  name: string
  address: string
  city: string
  county: string
  zip: string
  state: string
  licenseType: string
  vertical: string
  bedCount: string
  lat: string
  lng: string
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

function val(record: RawRecord, field: string): string {
  if (!field) return ''
  return String(record[field] || '').trim()
}

function numVal(record: RawRecord, field: string): number | null {
  if (!field) return null
  const v = record[field]
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
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

function normalizeForMatch(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '')
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
    let enriched = 0
    const errors: string[] = []

    const newSites: (typeof sites.$inferInsert)[] = []
    const newSrcRecords: (typeof sourceRecords.$inferInsert)[] = []
    const updates: { id: string; data: Record<string, unknown> }[] = []
    const updateSrcRecords: (typeof sourceRecords.$inferInsert)[] = []

    for (const record of records) {
      try {
        const classifierRecord = columnMapping ? remapRecord(record, columnMapping) : record

        const classification =
          sourceType === 'ABC'
            ? classifyAbc(classifierRecord)
            : classifyGeneric(classifierRecord, sourceType as GenericSourceType)

        const addr = extractAddress(record, columnMapping)
        if (!addr.name) continue

        const bedCount = columnMapping ? numVal(record, columnMapping.bedCount) : null
        const lat = columnMapping ? numVal(record, columnMapping.lat) : null
        const lng = columnMapping ? numVal(record, columnMapping.lng) : null

        const nameNorm = normalizeForMatch(addr.name)
        const zipNorm = addr.zip ? addr.zip.slice(0, 5) : ''

        let existingSite = null
        if (zipNorm) {
          const matches = await db.select({ id: sites.id, sourceSystems: sites.sourceSystems })
            .from(sites)
            .where(and(
              eq(sql`upper(replace(replace(replace(${sites.name}, ' ', ''), '.', ''), ',', ''))`, nameNorm),
              eq(sites.zip, zipNorm)
            ))
            .limit(1)
          existingSite = matches[0] || null
        }

        if (existingSite) {
          const enrichFields: Record<string, unknown> = {
            updatedAt: sql`datetime('now')`,
          }
          if (bedCount !== null) enrichFields.bedCount = bedCount
          if (lat !== null) enrichFields.lat = lat
          if (lng !== null) enrichFields.lng = lng
          if (addr.address && !existingSite.sourceSystems?.includes(sourceType)) {
            enrichFields.address = addr.address
          }
          if (addr.city) enrichFields.city = addr.city
          if (addr.county) enrichFields.county = addr.county

          const existingSources = existingSite.sourceSystems || ''
          if (!existingSources.includes(sourceType)) {
            enrichFields.sourceSystems = existingSources ? `${existingSources},${sourceType}` : sourceType
          }

          updates.push({ id: existingSite.id, data: enrichFields })
          updateSrcRecords.push({
            id: ulid(),
            siteId: existingSite.id,
            sourceName: sourceType,
            sourceRecordId: String(
              record[columnMapping?.licenseType || 'License Number'] ||
              record['FACID'] || record['CDSCode'] || ''
            ),
            rawData: JSON.stringify(record),
          })
          enriched++
        } else {
          const siteId = ulid()
          newSites.push({
            id: siteId,
            name: addr.name,
            address: addr.address,
            city: addr.city,
            county: addr.county,
            zip: addr.zip,
            lat,
            lng,
            vertical: classification.vertical || 'other',
            subVertical: classification.subVertical || '',
            confidence: classification.confidence || 'low',
            status: classification.needsReview ? 'needs_review' : 'active',
            bedCount,
            sourceSystems: sourceType,
          })
          newSrcRecords.push({
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
        }
      } catch (err) {
        errors.push(`Row error: ${(err as Error).message}`)
      }
    }

    const CHUNK = 50
    if (newSites.length > 0) {
      for (let i = 0; i < newSites.length; i += CHUNK) {
        await db.insert(sites).values(newSites.slice(i, i + CHUNK))
        await db.insert(sourceRecords).values(newSrcRecords.slice(i, i + CHUNK))
      }
    }

    for (const upd of updates) {
      await db.update(sites).set(upd.data).where(eq(sites.id, upd.id))
    }

    if (updateSrcRecords.length > 0) {
      for (let i = 0; i < updateSrcRecords.length; i += CHUNK) {
        await db.insert(sourceRecords).values(updateSrcRecords.slice(i, i + CHUNK))
      }
    }

    return NextResponse.json({ classified, needsReview, enriched, errors: errors.slice(0, 5) })
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
