'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TerritoryFilter,
  type TerritoryFilters,
} from '@/components/prospecting/territory-filter'
import { VerticalTabs } from '@/components/prospecting/vertical-tabs'
import { SiteTable, type SiteRow } from '@/components/prospecting/site-table'

interface SitesResponse {
  sites: SiteRow[]
  total: number
  page: number
  totalPages: number
}

const EMPTY_FILTERS: TerritoryFilters = {
  zips: [],
  county: '',
  search: '',
}

export default function ProspectingPage() {
  const [filters, setFilters] = useState<TerritoryFilters>(EMPTY_FILTERS)
  const [vertical, setVertical] = useState('All')
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [data, setData] = useState<SitesResponse>({
    sites: [],
    total: 0,
    page: 1,
    totalPages: 0,
  })
  const [verticalCounts, setVerticalCounts] = useState<Record<string, number>>(
    {}
  )
  const [loading, setLoading] = useState(false)

  const fetchSites = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (filters.zips.length > 0) {
        params.set('zip', filters.zips.join(','))
      }
      if (filters.county) {
        params.set('county', filters.county)
      }
      if (filters.search) {
        params.set('search', filters.search)
      }
      if (vertical && vertical !== 'All') {
        params.set('vertical', vertical)
      }
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await fetch(`/api/sites?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch sites')
      const json: SitesResponse = await res.json()
      setData(json)
    } catch (error) {
      console.error('Error fetching sites:', error)
    } finally {
      setLoading(false)
    }
  }, [filters, vertical, page, limit])

  // Fetch vertical counts (without vertical filter) for tab badges
  const fetchVerticalCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams()

      if (filters.zips.length > 0) {
        params.set('zip', filters.zips.join(','))
      }
      if (filters.county) {
        params.set('county', filters.county)
      }
      if (filters.search) {
        params.set('search', filters.search)
      }
      // Fetch a large page to get all verticals counted
      params.set('limit', '1')
      params.set('page', '1')

      // We need counts per vertical — fetch All to get total,
      // then individual verticals. For efficiency, do "All" fetch
      // and parse the total from it
      const verticals = [
        'Restaurants',
        'Bars',
        'Healthcare',
        'Schools',
        'Housing',
        'Hotels',
        'Grocery',
        'Other',
      ]

      const counts: Record<string, number> = {}

      const promises = verticals.map(async (v) => {
        const p = new URLSearchParams(params)
        p.set('vertical', v)
        const res = await fetch(`/api/sites?${p.toString()}`)
        if (res.ok) {
          const json = await res.json()
          counts[v] = json.total
        } else {
          counts[v] = 0
        }
      })

      await Promise.all(promises)
      setVerticalCounts(counts)
    } catch (error) {
      console.error('Error fetching vertical counts:', error)
    }
  }, [filters])

  useEffect(() => {
    fetchSites()
  }, [fetchSites])

  useEffect(() => {
    fetchVerticalCounts()
  }, [fetchVerticalCounts])

  function handleFilterChange(newFilters: TerritoryFilters) {
    setFilters(newFilters)
    setPage(1)
  }

  function handleVerticalChange(newVertical: string) {
    setVertical(newVertical)
    setPage(1)
  }

  function handleSortChange(column: string) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Client-side sort since the API sorts by name
  const sortedSites = [...data.sites].sort((a, b) => {
    const col = sortColumn as keyof SiteRow
    const aVal = a[col] ?? ''
    const bVal = b[col] ?? ''

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Prospecting</h2>
        <p className="mt-1 text-muted-foreground">
          Search and manage prospecting targets.
        </p>
      </div>

      {/* Territory filters */}
      <TerritoryFilter
        onFilterChange={handleFilterChange}
        activeFilters={filters}
        totalSites={data.total}
      />

      {/* Vertical tabs */}
      <VerticalTabs
        selected={vertical}
        onVerticalChange={handleVerticalChange}
        counts={verticalCounts}
      />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {loading ? 'Loading...' : `${data.total} sites found`}
        </p>
        {selectedIds.size > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </p>
        )}
      </div>

      {/* Data table */}
      <SiteTable
        sites={sortedSites}
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        limit={limit}
        onPageChange={setPage}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />
    </div>
  )
}
