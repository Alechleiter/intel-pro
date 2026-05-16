'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReviewTable, type ReviewSite } from '@/components/review/review-table'
import { ReviewToolbar } from '@/components/review/review-toolbar'
import { toast } from 'sonner'

interface VerticalBreakdown {
  vertical: string
  count: number
}

interface ReviewData {
  sites: ReviewSite[]
  total: number
  totalUnfiltered: number
  page: number
  totalPages: number
  verticalBreakdown: VerticalBreakdown[]
}

function formatVertical(v: string): string {
  return v
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function ReviewQueuePage() {
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [verticalFilter, setVerticalFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({})
  const [isApproving, setIsApproving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '25')
      if (verticalFilter && verticalFilter !== 'all') {
        params.set('vertical', verticalFilter)
      }

      const response = await fetch(`/api/review?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch')

      const json: ReviewData = await response.json()
      setData(json)
    } catch (error) {
      console.error('Error fetching review data:', error)
      toast.error('Failed to load review queue')
    } finally {
      setLoading(false)
    }
  }, [page, verticalFilter])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  const handleAction = useCallback(
    async (
      siteId: string,
      action: 'approve' | 'reclassify' | 'reject',
      updates?: { vertical: string; subVertical?: string }
    ) => {
      setActionInProgress((prev) => ({ ...prev, [siteId]: true }))

      try {
        const response = await fetch('/api/review', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, action, updates }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to process action')
        }

        const actionLabels = {
          approve: 'approved',
          reclassify: 'reclassified',
          reject: 'rejected',
        }
        toast.success(`Site ${actionLabels[action]} successfully`)

        // Refetch after a brief delay so the fade-out is visible
        setTimeout(() => {
          fetchData()
        }, 600)
      } catch (error) {
        console.error('Error processing action:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to process action')
      } finally {
        setActionInProgress((prev) => ({ ...prev, [siteId]: false }))
      }
    },
    [fetchData]
  )

  const handleApproveAll = useCallback(async () => {
    if (!data || data.sites.length === 0) return

    setIsApproving(true)
    try {
      const siteIds = data.sites.map((s) => s.id)
      const response = await fetch('/api/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteIds, action: 'approve' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve all')
      }

      const result = await response.json()
      toast.success(`${result.updatedCount} items approved successfully`)

      // Refetch
      fetchData()
    } catch (error) {
      console.error('Error approving all:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to approve items')
    } finally {
      setIsApproving(false)
    }
  }, [data, fetchData])

  const handleVerticalFilterChange = useCallback((vertical: string) => {
    setVerticalFilter(vertical)
    setPage(1) // Reset to page 1 when filter changes
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Review Queue</h2>
          <p className="mt-2 text-muted-foreground">
            Review and approve pending classifications.
          </p>
        </div>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading review queue...
        </div>
      </div>
    )
  }

  const totalUnfiltered = data?.totalUnfiltered ?? 0
  const verticalBreakdown = data?.verticalBreakdown ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Review Queue</h2>
        <p className="mt-2 text-muted-foreground">
          Review and approve pending classifications.
        </p>
      </div>

      {/* Stats bar */}
      {verticalBreakdown.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Breakdown by vertical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {verticalBreakdown.map((item) => (
                <button
                  key={item.vertical}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                  onClick={() => {
                    handleVerticalFilterChange(
                      verticalFilter === item.vertical ? 'all' : item.vertical
                    )
                  }}
                >
                  {formatVertical(item.vertical)}
                  <Badge variant="secondary" className="ml-0.5 tabular-nums">
                    {item.count}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <ReviewToolbar
        total={totalUnfiltered}
        visibleCount={data?.sites.length ?? 0}
        verticalFilter={verticalFilter}
        onVerticalFilterChange={handleVerticalFilterChange}
        onApproveAll={handleApproveAll}
        isApproving={isApproving}
      />

      {/* Review table */}
      <ReviewTable
        sites={data?.sites ?? []}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        onAction={handleAction}
        onPageChange={handlePageChange}
        actionInProgress={actionInProgress}
      />
    </div>
  )
}
