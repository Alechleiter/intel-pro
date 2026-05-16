'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Mail,
  Phone,
  User,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react'

interface SiteData {
  id: string
  name: string
  address: string | null
  city: string | null
  county: string | null
  state: string | null
  zip: string | null
  lat: number | null
  lng: number | null
  vertical: string
  subVertical: string | null
  confidence: string
  status: string
  siteCount: number | null
  chainId: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface ChainData {
  id: string
  name: string | null
  brand: string | null
  totalSites: number | null
  headquarters: string | null
}

interface ContactData {
  id: string
  siteId: string | null
  chainId: string | null
  name: string
  title: string | null
  phone: string | null
  email: string | null
  isDecisionMaker: boolean | null
  source: string | null
}

interface SourceRecordData {
  id: string
  siteId: string
  sourceName: string
  sourceUrl: string | null
  sourceDate: string | null
  sourceRecordId: string | null
  rawData: string | null
}

interface SiteDetailResponse {
  site: SiteData
  chain: ChainData | null
  contacts: ContactData[]
  sourceRecords: SourceRecordData[]
}

interface SiteDetailProps {
  siteId: string | null
  open: boolean
  onClose: () => void
}

function ConfidenceBadge({ value }: { value: string }) {
  const colors =
    value === 'high'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : value === 'medium'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'

  return (
    <Badge
      variant={value === 'high' ? 'default' : value === 'medium' ? 'secondary' : 'destructive'}
      className={colors}
    >
      {value}
    </Badge>
  )
}

function StatusBadge({ value }: { value: string }) {
  const colors =
    value === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : value === 'needs_review'
        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400'

  const label = value === 'needs_review' ? 'Needs Review' : value

  return (
    <Badge variant="outline" className={colors}>
      {label}
    </Badge>
  )
}

export function SiteDetail({ siteId, open, onClose }: SiteDetailProps) {
  const [data, setData] = useState<SiteDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRawData, setExpandedRawData] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open || !siteId) {
      setData(null)
      setError(null)
      setExpandedRawData(new Set())
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/sites/${siteId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load site details')
        return res.json()
      })
      .then((json: SiteDetailResponse) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [siteId, open])

  function toggleRawData(recordId: string) {
    setExpandedRawData((prev) => {
      const next = new Set(prev)
      if (next.has(recordId)) {
        next.delete(recordId)
      } else {
        next.add(recordId)
      }
      return next
    })
  }

  function formatAddress(site: SiteData) {
    const parts = [site.address, site.city, site.county].filter(Boolean)
    const stateZip = [site.state, site.zip].filter(Boolean).join(' ')
    if (stateZip) parts.push(stateZip)
    return parts.join(', ') || 'No address'
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Header */}
            <SheetHeader>
              <SheetTitle className="text-xl">{data.site.name}</SheetTitle>
              <SheetDescription>{formatAddress(data.site)}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-8">
              {/* Site Info */}
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Site Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Vertical</p>
                      <Badge variant="secondary" className="mt-1">
                        {data.site.vertical}
                      </Badge>
                    </div>
                    {data.site.subVertical && (
                      <div>
                        <p className="text-muted-foreground">Sub-Vertical</p>
                        <p className="mt-1 font-medium">{data.site.subVertical}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <div className="mt-1">
                        <ConfidenceBadge value={data.site.confidence} />
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <div className="mt-1">
                        <StatusBadge value={data.site.status} />
                      </div>
                    </div>
                    {data.site.siteCount != null && (
                      <div>
                        <p className="text-muted-foreground">Site Count</p>
                        <p className="mt-1 font-medium">{data.site.siteCount}</p>
                      </div>
                    )}
                    {data.site.city && (
                      <div>
                        <p className="text-muted-foreground">City</p>
                        <p className="mt-1 font-medium">{data.site.city}</p>
                      </div>
                    )}
                    {data.site.county && (
                      <div>
                        <p className="text-muted-foreground">County</p>
                        <p className="mt-1 font-medium">{data.site.county}</p>
                      </div>
                    )}
                    {data.site.zip && (
                      <div>
                        <p className="text-muted-foreground">ZIP</p>
                        <p className="mt-1 font-medium">{data.site.zip}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Chain */}
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="size-4" />
                    Chain
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.chain ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">{data.chain.name}</span>
                      </div>
                      {data.chain.brand && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Brand</span>
                          <span className="font-medium">{data.chain.brand}</span>
                        </div>
                      )}
                      {data.chain.totalSites != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total Sites</span>
                          <span className="font-medium">{data.chain.totalSites}</span>
                        </div>
                      )}
                      {data.chain.headquarters && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">HQ</span>
                          <span className="font-medium">{data.chain.headquarters}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Independent</p>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Contacts */}
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="size-4" />
                    Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contacts yet</p>
                  ) : (
                    <div className="space-y-4">
                      {data.contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{contact.name}</span>
                            {contact.isDecisionMaker && (
                              <Badge variant="default" className="text-xs">
                                Decision Maker
                              </Badge>
                            )}
                          </div>
                          {contact.title && (
                            <p className="mt-0.5 text-muted-foreground">
                              {contact.title}
                            </p>
                          )}
                          <div className="mt-2 flex flex-col gap-1">
                            {contact.phone && (
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="size-3" />
                                {contact.phone}
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="size-3" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Source Records */}
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Source Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.sourceRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No source records</p>
                  ) : (
                    <div className="space-y-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Source</TableHead>
                            <TableHead className="text-xs">Record ID</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">URL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.sourceRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-xs">
                                {record.sourceName}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {record.sourceRecordId ?? '---'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {record.sourceDate ?? '---'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {record.sourceUrl ? (
                                  <a
                                    href={record.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    Link
                                    <ExternalLink className="size-3" />
                                  </a>
                                ) : (
                                  '---'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Raw data toggles */}
                      {data.sourceRecords.some((r) => r.rawData) && (
                        <div className="space-y-2">
                          {data.sourceRecords
                            .filter((r) => r.rawData)
                            .map((record) => (
                              <div key={record.id}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto px-1 py-0.5 text-xs text-muted-foreground"
                                  onClick={() => toggleRawData(record.id)}
                                >
                                  {expandedRawData.has(record.id) ? (
                                    <ChevronDown className="mr-1 size-3" />
                                  ) : (
                                    <ChevronRight className="mr-1 size-3" />
                                  )}
                                  Raw data ({record.sourceName})
                                </Button>
                                {expandedRawData.has(record.id) && (
                                  <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
                                    {(() => {
                                      try {
                                        return JSON.stringify(
                                          JSON.parse(record.rawData!),
                                          null,
                                          2
                                        )
                                      } catch {
                                        return record.rawData
                                      }
                                    })()}
                                  </pre>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
