import { NextRequest } from 'next/server'
import { db } from '@/db'
import { sites, chains } from '@/db/schema'
import { eq, like, and, or, inArray } from 'drizzle-orm'
import { sitesToExcelBuffer, type ExportSite } from '@/lib/export/excel'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const zip = searchParams.get('zip')
  const county = searchParams.get('county')
  const vertical = searchParams.get('vertical')
  const subVertical = searchParams.get('subVertical')
  const confidence = searchParams.get('confidence')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const ids = searchParams.get('ids')

  const conditions = []

  // If specific IDs are provided, filter to only those rows
  if (ids) {
    const idList = ids.split(',').map((id) => id.trim()).filter(Boolean)
    if (idList.length > 0) {
      conditions.push(inArray(sites.id, idList))
    }
  }

  // ZIP filter: comma-separated list
  if (zip) {
    const zips = zip.split(',').map((z) => z.trim()).filter(Boolean)
    if (zips.length === 1) {
      conditions.push(eq(sites.zip, zips[0]))
    } else if (zips.length > 1) {
      conditions.push(
        or(...zips.map((z) => eq(sites.zip, z)))!
      )
    }
  }

  // County filter
  if (county) {
    conditions.push(eq(sites.county, county))
  }

  // Vertical filter
  if (vertical && vertical !== 'All') {
    conditions.push(eq(sites.vertical, vertical))
  }

  // Sub-vertical filter
  if (subVertical) {
    conditions.push(eq(sites.subVertical, subVertical))
  }

  // Confidence filter
  if (confidence) {
    conditions.push(eq(sites.confidence, confidence))
  }

  // Status filter
  if (status) {
    conditions.push(eq(sites.status, status))
  }

  // Text search on name or address
  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        like(sites.name, searchPattern),
        like(sites.address, searchPattern)
      )!
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  try {
    // Fetch ALL matching rows (no pagination for export)
    const rows = await db
      .select({
        name: sites.name,
        address: sites.address,
        city: sites.city,
        county: sites.county,
        zip: sites.zip,
        vertical: sites.vertical,
        subVertical: sites.subVertical,
        confidence: sites.confidence,
        status: sites.status,
        siteCount: sites.siteCount,
        chainName: chains.name,
      })
      .from(sites)
      .leftJoin(chains, eq(sites.chainId, chains.id))
      .where(whereClause)
      .orderBy(sites.name)

    // Transform to export format
    const exportRows: ExportSite[] = rows.map((row) => ({
      Name: row.name,
      Address: row.address ?? '',
      City: row.city ?? '',
      County: row.county ?? '',
      ZIP: row.zip ?? '',
      Vertical: row.vertical,
      'Sub-Vertical': row.subVertical ?? '',
      Confidence: row.confidence,
      Status: row.status,
      Chain: row.chainName ?? '',
      'Site Count': row.siteCount,
    }))

    const buffer = sitesToExcelBuffer(exportRows)

    const date = new Date().toISOString().slice(0, 10)
    const filename = `intel-pro-export-${date}.xlsx`

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting sites:', error)
    return new Response(JSON.stringify({ error: 'Failed to export sites' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
