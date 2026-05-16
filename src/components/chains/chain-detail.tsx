'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BuildingIcon,
  MapPinIcon,
  DownloadIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
} from 'lucide-react'

interface ChainInfo {
  id: string
  name: string
  brand: string | null
  totalSites: number | null
  headquarters: string | null
}

interface ChainSite {
  id: string
  name: string
  address: string | null
  city: string | null
  county: string | null
  state: string | null
  zip: string | null
  vertical: string
  subVertical: string | null
  confidence: string
  status: string
}

interface ChainContact {
  id: string
  name: string
  title: string | null
  phone: string | null
  email: string | null
  isDecisionMaker: boolean | null
  source: string | null
}

interface ChainDetailProps {
  chainId: string | null
  onClose: () => void
}

export function ChainDetail({ chainId, onClose }: ChainDetailProps) {
  const [chain, setChain] = useState<ChainInfo | null>(null)
  const [sites, setSites] = useState<ChainSite[]>([])
  const [contacts, setContacts] = useState<ChainContact[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/chains/${id}`)
      if (!res.ok) throw new Error('Failed to fetch chain detail')
      const data = await res.json()
      setChain(data.chain)
      setSites(data.sites)
      setContacts(data.contacts)
    } catch (error) {
      console.error('Error loading chain detail:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (chainId) {
      fetchDetail(chainId)
    } else {
      setChain(null)
      setSites([])
      setContacts([])
    }
  }, [chainId, fetchDetail])

  const handleExportSites = () => {
    if (!chainId || sites.length === 0) return
    // Use the existing export API filtered by chain sites
    const siteIds = sites.map((s) => s.id).join(',')
    window.open(`/api/export?ids=${encodeURIComponent(siteIds)}`, '_blank')
  }

  return (
    <Sheet
      open={!!chainId}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
        {loading ? (
          <SheetHeader>
            <SheetTitle>Loading...</SheetTitle>
          </SheetHeader>
        ) : chain ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg">{chain.name}</SheetTitle>
              <SheetDescription>
                Chain detail with sites and contacts
              </SheetDescription>
            </SheetHeader>

            {/* Chain info */}
            <div className="px-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {chain.brand && (
                  <Badge variant="secondary">{chain.brand}</Badge>
                )}
                <Badge variant="outline">
                  {chain.totalSites ?? 0} site{(chain.totalSites ?? 0) !== 1 ? 's' : ''}
                </Badge>
              </div>

              {chain.headquarters && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BuildingIcon className="size-4" />
                  <span>{chain.headquarters}</span>
                </div>
              )}
            </div>

            <Separator className="mx-4" />

            {/* Sites section */}
            <div className="px-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <MapPinIcon className="size-4" />
                  Sites ({sites.length})
                </h3>
                {sites.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportSites}>
                    <DownloadIcon data-icon="inline-start" />
                    Export Sites
                  </Button>
                )}
              </div>

              {sites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sites linked to this chain.
                </p>
              ) : (
                <div className="rounded-lg ring-1 ring-foreground/10">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>ZIP</TableHead>
                        <TableHead>Vertical</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sites.map((site) => (
                        <TableRow key={site.id}>
                          <TableCell className="font-medium">
                            {site.name}
                          </TableCell>
                          <TableCell>{site.address ?? '-'}</TableCell>
                          <TableCell>{site.city ?? '-'}</TableCell>
                          <TableCell>{site.zip ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{site.vertical}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator className="mx-4" />

            {/* Contacts section */}
            <div className="px-4 pb-4 flex flex-col gap-3">
              <h3 className="font-medium flex items-center gap-2">
                <UserIcon className="size-4" />
                Contacts ({contacts.length})
              </h3>

              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contacts for this chain.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-lg ring-1 ring-foreground/10 p-3 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{contact.name}</span>
                        {contact.isDecisionMaker && (
                          <Badge variant="default">Decision Maker</Badge>
                        )}
                      </div>
                      {contact.title && (
                        <span className="text-sm text-muted-foreground">
                          {contact.title}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <MailIcon className="size-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <PhoneIcon className="size-3" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>Chain not found</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}
