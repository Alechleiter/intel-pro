'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { SiteDetail } from './site-detail'

export interface SiteRow {
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
  chainName: string | null
}

interface SiteTableProps {
  sites: SiteRow[]
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  onSortChange: (column: string) => void
}

function ConfidenceBadge({ value }: { value: string }) {
  const variant =
    value === 'high'
      ? 'default'
      : value === 'medium'
        ? 'secondary'
        : 'destructive'

  const colors =
    value === 'high'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : value === 'medium'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'

  return (
    <Badge variant={variant} className={colors}>
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

function SortableHeader({
  label,
  column,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string
  column: string
  currentSort: string
  currentDirection: 'asc' | 'desc'
  onSort: (column: string) => void
}) {
  const isActive = currentSort === column

  return (
    <button
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => onSort(column)}
    >
      {label}
      {isActive ? (
        currentDirection === 'asc' ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-40" />
      )}
    </button>
  )
}

export function SiteTable({
  sites,
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  selectedIds,
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSortChange,
}: SiteTableProps) {
  const [detailSiteId, setDetailSiteId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const allSelected =
    sites.length > 0 && sites.every((s) => selectedIds.has(s.id))

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selectedIds)
      sites.forEach((s) => next.delete(s.id))
      onSelectionChange(next)
    } else {
      const next = new Set(selectedIds)
      sites.forEach((s) => next.add(s.id))
      onSelectionChange(next)
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="size-4 rounded border-input accent-primary"
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label="Name"
                column="name"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label="Address"
                column="address"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label="City"
                column="city"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label="ZIP"
                column="zip"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label="County"
                column="county"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label="Vertical"
                column="vertical"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
              />
            </TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Chain</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                No sites found.
              </TableCell>
            </TableRow>
          ) : (
            sites.map((site) => (
              <TableRow
                key={site.id}
                data-state={selectedIds.has(site.id) ? 'selected' : undefined}
                className="cursor-pointer"
                onClick={() => {
                  setDetailSiteId(site.id)
                  setDetailOpen(true)
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(site.id)}
                    onChange={() => toggleRow(site.id)}
                    className="size-4 rounded border-input accent-primary"
                  />
                </TableCell>
                <TableCell className="font-medium">{site.name}</TableCell>
                <TableCell>{site.address ?? '—'}</TableCell>
                <TableCell>{site.city ?? '—'}</TableCell>
                <TableCell>{site.zip ?? '—'}</TableCell>
                <TableCell>{site.county ?? '—'}</TableCell>
                <TableCell>{site.vertical}</TableCell>
                <TableCell>
                  <ConfidenceBadge value={site.confidence} />
                </TableCell>
                <TableCell>{site.chainName ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge value={site.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `Showing ${startIndex}–${endIndex} of ${total}`
            : 'No results'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <SiteDetail
        siteId={detailSiteId}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetailSiteId(null)
        }}
      />
    </div>
  )
}
