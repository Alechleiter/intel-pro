'use client'

import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  SearchIcon,
  ArrowUpDownIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'

interface Chain {
  id: string
  name: string
  brand: string | null
  totalSites: number | null
  headquarters: string | null
}

interface ChainTableProps {
  onSelectChain: (chainId: string) => void
}

type SortDirection = 'asc' | 'desc'

export function ChainTable({ onSelectChain }: ChainTableProps) {
  const [chains, setChains] = useState<Chain[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchChains = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('page', String(page))
      params.set('limit', '50')

      const res = await fetch(`/api/chains?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch chains')

      const data = await res.json()
      let sorted = data.chains as Chain[]

      // Client-side sort toggle (API always returns desc by totalSites)
      if (sortDir === 'asc') {
        sorted = [...sorted].sort(
          (a, b) => (a.totalSites ?? 0) - (b.totalSites ?? 0)
        )
      }

      setChains(sorted)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error loading chains:', error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page, sortDir])

  useEffect(() => {
    fetchChains()
  }, [fetchChains])

  const toggleSort = () => {
    setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  const SortIcon =
    sortDir === 'desc' ? ArrowDownIcon : sortDir === 'asc' ? ArrowUpIcon : ArrowUpDownIcon

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search chains by name or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>
                <button
                  onClick={toggleSort}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Total Sites
                  <SortIcon className="size-3.5" />
                </button>
              </TableHead>
              <TableHead>Headquarters</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading chains...
                </TableCell>
              </TableRow>
            ) : chains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No chains found.
                </TableCell>
              </TableRow>
            ) : (
              chains.map((chain) => (
                <TableRow
                  key={chain.id}
                  className="cursor-pointer"
                  onClick={() => onSelectChain(chain.id)}
                >
                  <TableCell className="font-medium">{chain.name}</TableCell>
                  <TableCell>
                    {chain.brand ? (
                      <Badge variant="secondary">{chain.brand}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{chain.totalSites ?? 0}</Badge>
                  </TableCell>
                  <TableCell>{chain.headquarters ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} chain{total !== 1 ? 's' : ''} total
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeftIcon />
          </Button>
          <span>
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
