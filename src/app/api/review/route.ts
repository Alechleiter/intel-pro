import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { sites, sourceRecords } from '@/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const vertical = searchParams.get('vertical')
  const confidence = searchParams.get('confidence')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))
  const offset = (page - 1) * limit

  const conditions = [eq(sites.status, 'needs_review')]

  if (vertical && vertical !== 'all') {
    conditions.push(eq(sites.vertical, vertical))
  }

  if (confidence) {
    conditions.push(eq(sites.confidence, confidence))
  }

  const whereClause = and(...conditions)

  try {
    // Total count of items needing review (with filters)
    const [countResult] = await db
      .select({ total: count() })
      .from(sites)
      .where(whereClause)

    const total = countResult?.total ?? 0
    const totalPages = Math.ceil(total / limit)

    // Breakdown by vertical (unfiltered, always show full picture)
    const verticalBreakdown = await db
      .select({
        vertical: sites.vertical,
        count: count(),
      })
      .from(sites)
      .where(eq(sites.status, 'needs_review'))
      .groupBy(sites.vertical)

    // Paginated sites needing review
    const rows = await db
      .select({
        id: sites.id,
        name: sites.name,
        address: sites.address,
        city: sites.city,
        state: sites.state,
        zip: sites.zip,
        vertical: sites.vertical,
        subVertical: sites.subVertical,
        confidence: sites.confidence,
        status: sites.status,
        createdAt: sites.createdAt,
      })
      .from(sites)
      .where(whereClause)
      .orderBy(sites.confidence, sites.createdAt)
      .limit(limit)
      .offset(offset)

    // Fetch source records for these sites
    type SourceRecord = {
      id: string
      siteId: string
      sourceName: string
      sourceUrl: string | null
      sourceDate: string | null
      sourceRecordId: string | null
      rawData: string | null
    }

    const siteIds = rows.map((r) => r.id)
    const sourceRecordsMap: Record<string, SourceRecord[]> = {}
    let siteSourceRecords: SourceRecord[] = []

    if (siteIds.length > 0) {
      // Fetch all source records for the visible sites
      siteSourceRecords = await db
        .select()
        .from(sourceRecords)
        .where(
          sql`${sourceRecords.siteId} IN (${sql.join(
            siteIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )

      // Group by siteId
      for (const record of siteSourceRecords) {
        if (!sourceRecordsMap[record.siteId]) {
          sourceRecordsMap[record.siteId] = []
        }
        sourceRecordsMap[record.siteId].push(record)
      }
    }

    // Combine sites with their source records
    const sitesWithSources = rows.map((site) => ({
      ...site,
      sourceRecords: sourceRecordsMap[site.id] || [],
    }))

    // Total unfiltered count for the stats bar
    const [totalUnfiltered] = await db
      .select({ total: count() })
      .from(sites)
      .where(eq(sites.status, 'needs_review'))

    return NextResponse.json({
      sites: sitesWithSources,
      total,
      totalUnfiltered: totalUnfiltered?.total ?? 0,
      page,
      totalPages,
      verticalBreakdown,
    })
  } catch (error) {
    console.error('Error fetching review queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review queue' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { siteId, siteIds, action, updates } = body as {
      siteId?: string
      siteIds?: string[]
      action: 'approve' | 'reclassify' | 'reject'
      updates?: {
        vertical?: string
        subVertical?: string
      }
    }

    // Support both single siteId and bulk siteIds
    const ids = siteIds || (siteId ? [siteId] : [])

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'siteId or siteIds is required' },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    let updatedCount = 0

    for (const id of ids) {
      switch (action) {
        case 'approve':
          await db
            .update(sites)
            .set({
              status: 'active',
              updatedAt: now,
            })
            .where(eq(sites.id, id))
          updatedCount++
          break

        case 'reclassify':
          if (!updates?.vertical) {
            return NextResponse.json(
              { error: 'vertical is required for reclassify action' },
              { status: 400 }
            )
          }
          await db
            .update(sites)
            .set({
              vertical: updates.vertical,
              subVertical: updates.subVertical || null,
              confidence: 'high',
              status: 'active',
              updatedAt: now,
            })
            .where(eq(sites.id, id))
          updatedCount++
          break

        case 'reject':
          await db
            .update(sites)
            .set({
              status: 'inactive',
              updatedAt: now,
            })
            .where(eq(sites.id, id))
          updatedCount++
          break

        default:
          return NextResponse.json(
            { error: `Invalid action: ${action}` },
            { status: 400 }
          )
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
    })
  } catch (error) {
    console.error('Error processing review action:', error)
    return NextResponse.json(
      { error: 'Failed to process review action' },
      { status: 500 }
    )
  }
}
