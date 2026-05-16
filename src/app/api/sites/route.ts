import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { sites, chains } from '@/db/schema'
import { eq, like, and, or, sql, count } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const zip = searchParams.get('zip')
  const county = searchParams.get('county')
  const vertical = searchParams.get('vertical')
  const subVertical = searchParams.get('subVertical')
  const confidence = searchParams.get('confidence')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
  const offset = (page - 1) * limit

  const conditions = []

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
    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(sites)
      .where(whereClause)

    const total = countResult?.total ?? 0
    const totalPages = Math.ceil(total / limit)

    // Get paginated sites with chain name
    const rows = await db
      .select({
        id: sites.id,
        name: sites.name,
        address: sites.address,
        city: sites.city,
        county: sites.county,
        state: sites.state,
        zip: sites.zip,
        lat: sites.lat,
        lng: sites.lng,
        vertical: sites.vertical,
        subVertical: sites.subVertical,
        confidence: sites.confidence,
        status: sites.status,
        siteCount: sites.siteCount,
        chainId: sites.chainId,
        chainName: chains.name,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
      })
      .from(sites)
      .leftJoin(chains, eq(sites.chainId, chains.id))
      .where(whereClause)
      .orderBy(sites.name)
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      sites: rows,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching sites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}
