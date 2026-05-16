'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CALIFORNIA_COUNTIES } from '@/lib/constants/california-counties'

export interface TerritoryFilters {
  zips: string[]
  county: string
  search: string
}

interface TerritoryFilterProps {
  onFilterChange: (filters: TerritoryFilters) => void
  activeFilters: TerritoryFilters
  totalSites: number
}

export function TerritoryFilter({
  onFilterChange,
  activeFilters,
  totalSites,
}: TerritoryFilterProps) {
  const [zipInput, setZipInput] = useState('')
  const [bulkZips, setBulkZips] = useState('')
  const [county, setCounty] = useState(activeFilters.county)
  const [search, setSearch] = useState(activeFilters.search)

  function handleApply() {
    // Combine single ZIP + bulk ZIPs
    const allZips: string[] = []

    if (zipInput.trim()) {
      allZips.push(zipInput.trim())
    }

    if (bulkZips.trim()) {
      const parsed = bulkZips
        .split(/[,\n\r]+/)
        .map((z) => z.trim())
        .filter(Boolean)
      allZips.push(...parsed)
    }

    // Deduplicate
    const uniqueZips = [...new Set(allZips)]

    onFilterChange({
      zips: uniqueZips,
      county,
      search,
    })
  }

  function handleClear() {
    setZipInput('')
    setBulkZips('')
    setCounty('')
    setSearch('')
    onFilterChange({ zips: [], county: '', search: '' })
  }

  // Build active filter summary
  function getFilterSummary(): string | null {
    const parts: string[] = []

    if (activeFilters.zips.length > 0) {
      parts.push(
        `${activeFilters.zips.length} ZIP${activeFilters.zips.length > 1 ? 's' : ''}`
      )
    }
    if (activeFilters.county) {
      parts.push(`${activeFilters.county} County`)
    }
    if (activeFilters.search) {
      parts.push(`"${activeFilters.search}"`)
    }

    if (parts.length === 0) return null

    return `Showing ${totalSites} sites filtered by ${parts.join(', ')}`
  }

  const summary = getFilterSummary()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Search name or address
          </label>
          <Input
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply()
            }}
          />
        </div>

        {/* Single ZIP */}
        <div className="w-[120px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            ZIP Code
          </label>
          <Input
            placeholder="e.g. 90210"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply()
            }}
          />
        </div>

        {/* County dropdown */}
        <div className="w-[180px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            County
          </label>
          <Select value={county} onValueChange={(v) => setCounty(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All counties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All counties</SelectItem>
              {CALIFORNIA_COUNTIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Apply / Clear buttons */}
        <div className="flex gap-2">
          <Button onClick={handleApply}>Apply Filter</Button>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Bulk ZIP textarea */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Bulk ZIPs
        </label>
        <textarea
          className="h-16 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 resize-y"
          placeholder="Paste comma or newline separated ZIPs..."
          value={bulkZips}
          onChange={(e) => setBulkZips(e.target.value)}
        />
      </div>

      {/* Active filter summary */}
      {summary && (
        <p className="text-sm text-muted-foreground">{summary}</p>
      )}
    </div>
  )
}
