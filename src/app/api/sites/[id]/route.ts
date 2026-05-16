import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { sites, chains, contacts, sourceRecords } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Fetch site with chain info via left join
    const [siteRow] = await db
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
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
        chainName: chains.name,
        chainBrand: chains.brand,
        chainTotalSites: chains.totalSites,
        chainHeadquarters: chains.headquarters,
      })
      .from(sites)
      .leftJoin(chains, eq(sites.chainId, chains.id))
      .where(eq(sites.id, id))

    if (!siteRow) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Build the site and chain objects
    const site = {
      id: siteRow.id,
      name: siteRow.name,
      address: siteRow.address,
      city: siteRow.city,
      county: siteRow.county,
      state: siteRow.state,
      zip: siteRow.zip,
      lat: siteRow.lat,
      lng: siteRow.lng,
      vertical: siteRow.vertical,
      subVertical: siteRow.subVertical,
      confidence: siteRow.confidence,
      status: siteRow.status,
      siteCount: siteRow.siteCount,
      chainId: siteRow.chainId,
      createdAt: siteRow.createdAt,
      updatedAt: siteRow.updatedAt,
    }

    const chain = siteRow.chainId
      ? {
          id: siteRow.chainId,
          name: siteRow.chainName,
          brand: siteRow.chainBrand,
          totalSites: siteRow.chainTotalSites,
          headquarters: siteRow.chainHeadquarters,
        }
      : null

    // Fetch contacts for this site
    const siteContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.siteId, id))

    // Fetch source records for this site
    const siteSourceRecords = await db
      .select()
      .from(sourceRecords)
      .where(eq(sourceRecords.siteId, id))

    return NextResponse.json({
      site,
      chain,
      contacts: siteContacts,
      sourceRecords: siteSourceRecords,
    })
  } catch (error) {
    console.error('Error fetching site detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch site detail' },
      { status: 500 }
    )
  }
}
