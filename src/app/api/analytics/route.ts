import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { sites, imports } from '@/db/schema'
import { eq, and, or, sql, count, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const zip = searchParams.get('zip')
  const county = searchParams.get('county')

  const conditions = []

  // ZIP filter: comma-separated list
  if (zip) {
    const zips = zip
      .split(',')
      .map((z) => z.trim())
      .filter(Boolean)
    if (zips.length === 1) {
      conditions.push(eq(sites.zip, zips[0]))
    } else if (zips.length > 1) {
      conditions.push(or(...zips.map((z) => eq(sites.zip, z)))!)
    }
  }

  // County filter
  if (county) {
    conditions.push(eq(sites.county, county))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  try {
    // Total sites count
    const [totalResult] = await db
      .select({ total: count() })
      .from(sites)
      .where(whereClause)

    const totalSites = totalResult?.total ?? 0

    // Sites grouped by vertical
    const byVertical = await db
      .select({
        vertical: sites.vertical,
        count: count(),
      })
      .from(sites)
      .where(whereClause)
      .groupBy(sites.vertical)
      .orderBy(desc(count()))

    // Sites grouped by confidence
    const byConfidence = await db
      .select({
        confidence: sites.confidence,
        count: count(),
      })
      .from(sites)
      .where(whereClause)
      .groupBy(sites.confidence)

    // Sites grouped by county with top vertical per county
    // First get counts per county
    const countyRows = await db
      .select({
        county: sites.county,
        count: count(),
      })
      .from(sites)
      .where(whereClause)
      .groupBy(sites.county)
      .orderBy(desc(count()))

    // Get top vertical per county using a subquery approach
    const countyVerticalRows = await db
      .select({
        county: sites.county,
        vertical: sites.vertical,
        count: count(),
      })
      .from(sites)
      .where(whereClause)
      .groupBy(sites.county, sites.vertical)
      .orderBy(desc(count()))

    // Build county data with top vertical
    const countyTopVertical: Record<string, { count: number; vertical: string }> = {}
    for (const row of countyVerticalRows) {
      const key = row.county ?? 'Unknown'
      if (!countyTopVertical[key]) {
        countyTopVertical[key] = { count: row.count, vertical: row.vertical }
      }
    }

    const byCounty = countyRows.map((row) => ({
      county: row.county ?? 'Unknown',
      count: row.count,
      topVertical: countyTopVertical[row.county ?? 'Unknown']?.vertical ?? 'Unknown',
    }))

    // Sites grouped by vertical + sub-vertical
    const bySubVertical = await db
      .select({
        vertical: sites.vertical,
        subVertical: sites.subVertical,
        count: count(),
      })
      .from(sites)
      .where(whereClause)
      .groupBy(sites.vertical, sites.subVertical)
      .orderBy(desc(count()))

    // Recent imports (last 10)
    const recentImports = await db
      .select({
        sourceName: imports.sourceName,
        fileName: imports.fileName,
        recordCount: imports.recordCount,
        importedAt: imports.importedAt,
      })
      .from(imports)
      .orderBy(desc(imports.importedAt))
      .limit(10)

    return NextResponse.json({
      totalSites,
      byVertical: byVertical.map((r) => ({
        vertical: r.vertical,
        count: r.count,
      })),
      byConfidence: byConfidence.map((r) => ({
        confidence: r.confidence,
        count: r.count,
      })),
      byCounty,
      bySubVertical: bySubVertical.map((r) => ({
        vertical: r.vertical,
        subVertical: r.subVertical ?? 'General',
        count: r.count,
      })),
      recentImports: recentImports.map((r) => ({
        sourceName: r.sourceName,
        fileName: r.fileName,
        recordCount: r.recordCount ?? 0,
        importedAt: r.importedAt ?? '',
      })),
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
