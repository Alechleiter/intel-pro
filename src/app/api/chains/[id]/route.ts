import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chains, sites, contacts } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const [chain] = await db
      .select()
      .from(chains)
      .where(eq(chains.id, id))

    if (!chain) {
      return NextResponse.json({ error: 'Chain not found' }, { status: 404 })
    }

    const chainSites = await db
      .select({
        id: sites.id,
        name: sites.name,
        address: sites.address,
        city: sites.city,
        county: sites.county,
        state: sites.state,
        zip: sites.zip,
        vertical: sites.vertical,
        subVertical: sites.subVertical,
        confidence: sites.confidence,
        status: sites.status,
      })
      .from(sites)
      .where(eq(sites.chainId, id))
      .orderBy(sites.name)

    const chainContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.chainId, id))

    return NextResponse.json({
      chain,
      sites: chainSites,
      contacts: chainContacts,
    })
  } catch (error) {
    console.error('Error fetching chain detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chain detail' },
      { status: 500 }
    )
  }
}
