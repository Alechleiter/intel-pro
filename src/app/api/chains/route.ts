import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chains } from '@/db/schema'
import { like, or, count, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const search = searchParams.get('search')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
  const offset = (page - 1) * limit

  const conditions = []

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        like(chains.name, searchPattern),
        like(chains.brand, searchPattern)
      )!
    )
  }

  const whereClause = conditions.length > 0 ? conditions[0] : undefined

  try {
    const [countResult] = await db
      .select({ total: count() })
      .from(chains)
      .where(whereClause)

    const total = countResult?.total ?? 0
    const totalPages = Math.ceil(total / limit)

    const rows = await db
      .select({
        id: chains.id,
        name: chains.name,
        brand: chains.brand,
        totalSites: chains.totalSites,
        headquarters: chains.headquarters,
      })
      .from(chains)
      .where(whereClause)
      .orderBy(desc(chains.totalSites))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      chains: rows,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching chains:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chains' },
      { status: 500 }
    )
  }
}
