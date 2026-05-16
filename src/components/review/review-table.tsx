'use client'

import { useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { CheckIcon, XIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from 'lucide-react'
import type { Vertical } from '@/lib/classifiers/types'

const VERTICALS: Vertical[] = [
  'restaurant',
  'bar',
  'hotel',
  'grocery',
  'liquor',
  'healthcare',
  'assisted_living',
  'school',
  'apartment',
  'warehouse',
  'housing',
  'other',
]

const SUB_VERTICALS: Record<string, string[]> = {
  restaurant: ['Fast Food', 'Fast Casual', 'Fine Dining', 'Casual Dining', 'Cafe', 'Bakery', 'Food Truck', 'Other'],
  bar: ['Sports Bar', 'Nightclub', 'Lounge', 'Pub', 'Wine Bar', 'Brewery', 'Other'],
  hotel: ['Luxury', 'Boutique', 'Budget', 'Resort', 'Motel', 'Extended Stay', 'Other'],
  grocery: ['Supermarket', 'Specialty', 'Organic', 'Discount', 'Wholesale', 'Other'],
  liquor: ['Liquor Store', 'Wine Shop', 'Beer Distributor', 'Other'],
  healthcare: ['Hospital', 'Clinic', 'Dental', 'Pharmacy', 'Urgent Care', 'Other'],
  assisted_living: ['Nursing Home', 'Memory Care', 'Independent Living', 'Rehab', 'Other'],
  school: ['K-12', 'University', 'Trade School', 'Daycare', 'Other'],
  apartment: ['Luxury', 'Mid-Range', 'Affordable', 'Student Housing', 'Senior Living', 'Other'],
  warehouse: ['Distribution', 'Cold Storage', 'Self Storage', 'Fulfillment', 'Other'],
  housing: ['Single Family', 'Multi-Family', 'Condo', 'Townhome', 'Other'],
  other: ['Other'],
}

function formatVertical(v: string): string {
  return v
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export interface ReviewSite {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  vertical: string
  subVertical: string | null
  confidence: string
  status: string
  createdAt: string | null
  sourceRecords: {
    id: string
    siteId: string
    sourceName: string
    sourceUrl: string | null
    sourceDate: string | null
    sourceRecordId: string | null
    rawData: string | null
  }[]
}

interface ReviewTableProps {
  sites: ReviewSite[]
  page: number
  totalPages: number
  total: number
  onAction: (siteId: string, action: 'approve' | 'reclassify' | 'reject', updates?: { vertical: string; subVertical?: string }) => Promise<void>
  onPageChange: (page: number) => void
  actionInProgress: Record<string, boolean>
}

function getReasons(site: ReviewSite): string {
  // Try to extract reasons from rawData of source records
  for (const record of site.sourceRecords) {
    if (record.rawData) {
      try {
        const data = JSON.parse(record.rawData)
        if (data.classificationReasons) {
          return (data.classificationReasons as string[]).join('; ')
        }
        if (data.reasons) {
          return (data.reasons as string[]).join('; ')
        }
      } catch {
        // rawData is not JSON; skip
      }
    }
  }

  // Fallback: describe why it might need review
  if (site.confidence === 'low') {
    return 'Low confidence classification'
  }
  if (site.confidence === 'medium') {
    return 'Medium confidence — may need verification'
  }
  return 'Flagged for manual review'
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const variant =
    confidence === 'low'
      ? 'destructive'
      : confidence === 'medium'
        ? 'outline'
        : 'default'

  return <Badge variant={variant}>{confidence}</Badge>
}

export function ReviewTable({
  sites,
  page,
  totalPages,
  total,
  onAction,
  onPageChange,
  actionInProgress,
}: ReviewTableProps) {
  const [fadingOut, setFadingOut] = useState<Record<string, boolean>>({})

  const handleAction = useCallback(
    async (siteId: string, action: 'approve' | 'reclassify' | 'reject', updates?: { vertical: string; subVertical?: string }) => {
      await onAction(siteId, action, updates)
      setFadingOut((prev) => ({ ...prev, [siteId]: true }))
      // The parent will refetch and remove the row
    },
    [onAction]
  )

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No items to review</p>
        <p className="mt-1 text-sm">All records have been reviewed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>ZIP</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Sub-Vertical</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Reasons</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site) => {
              const isFading = fadingOut[site.id]
              const isProcessing = actionInProgress[site.id]

              return (
                <TableRow
                  key={site.id}
                  className={
                    isFading
                      ? 'opacity-30 transition-opacity duration-500'
                      : 'transition-opacity duration-300'
                  }
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {site.name}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {site.address || '—'}
                  </TableCell>
                  <TableCell>{site.city || '—'}</TableCell>
                  <TableCell>{site.zip || '—'}</TableCell>
                  <TableCell>{formatVertical(site.vertical)}</TableCell>
                  <TableCell>{site.subVertical || '—'}</TableCell>
                  <TableCell>
                    <ConfidenceBadge confidence={site.confidence} />
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {getReasons(site)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isProcessing ? (
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleAction(site.id, 'approve')}
                            disabled={isFading}
                          >
                            <CheckIcon className="size-3.5" />
                            Approve
                          </Button>

                          <ReclassifyDropdown
                            site={site}
                            onReclassify={(vertical, subVertical) =>
                              handleAction(site.id, 'reclassify', { vertical, subVertical })
                            }
                            disabled={isFading}
                          />

                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleAction(site.id, 'reject')}
                            disabled={isFading}
                          >
                            <XIcon className="size-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeftIcon className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReclassifyDropdown({
  site,
  onReclassify,
  disabled,
}: {
  site: ReviewSite
  onReclassify: (vertical: string, subVertical?: string) => void
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="xs"
            variant="ghost"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            disabled={disabled}
          />
        }
      >
        <EditIcon className="size-3.5" />
        Reclassify
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select correct vertical</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {VERTICALS.map((v) => {
          const subs = SUB_VERTICALS[v] || []
          if (subs.length <= 1) {
            return (
              <DropdownMenuItem
                key={v}
                onClick={() => onReclassify(v)}
              >
                {formatVertical(v)}
                {v === site.vertical && (
                  <span className="ml-auto text-xs text-muted-foreground">(current)</span>
                )}
              </DropdownMenuItem>
            )
          }
          return (
            <DropdownMenuSub key={v}>
              <DropdownMenuSubTrigger>
                {formatVertical(v)}
                {v === site.vertical && (
                  <span className="ml-1 text-xs text-muted-foreground">(current)</span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => onReclassify(v)}
                >
                  {formatVertical(v)} (no sub-vertical)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {subs.map((sub) => (
                  <DropdownMenuItem
                    key={sub}
                    onClick={() => onReclassify(v, sub)}
                  >
                    {sub}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
