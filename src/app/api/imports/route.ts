import { NextResponse } from 'next/server'
import { db } from '@/db'
import { imports } from '@/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(imports)
      .orderBy(desc(imports.importedAt))
      .limit(50)

    return NextResponse.json({ imports: rows })
  } catch (err) {
    console.error('Fetch imports error:', err)
    return NextResponse.json(
      { error: `Failed to fetch imports: ${(err as Error).message}` },
      { status: 500 },
    )
  }
}
