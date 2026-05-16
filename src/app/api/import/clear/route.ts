import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sites, sourceRecords, contacts, imports } from '@/db/schema'
import { sql } from 'drizzle-orm'

export async function DELETE() {
  try {
    const siteCount = await db.select({ count: sql<number>`count(*)` }).from(sites)
    const total = siteCount[0]?.count ?? 0

    await db.delete(sourceRecords)
    await db.delete(contacts)
    await db.delete(sites)
    await db.delete(imports)

    return NextResponse.json({ deleted: total })
  } catch (err) {
    console.error('Clear data error:', err)
    return NextResponse.json(
      { error: `Clear failed: ${(err as Error).message}` },
      { status: 500 },
    )
  }
}
