'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { TamCards } from '@/components/analytics/tam-cards'
import { VerticalChart } from '@/components/analytics/vertical-chart'
import { ConfidenceChart } from '@/components/analytics/confidence-chart'
import { CountyTable } from '@/components/analytics/county-table'

interface AnalyticsData {
  totalSites: number
  byVertical: { vertical: string; count: number }[]
  byConfidence: { confidence: string; count: number }[]
  byCounty: { county: string; count: number; topVertical: string }[]
  bySubVertical: { vertical: string; subVertical: string; count: number }[]
  recentImports: {
    sourceName: string
    fileName: string
    recordCount: number
    importedAt: string
  }[]
}

export default function AnalyticsPage() {
  const [zipInput, setZipInput] = useState('')
  const [county, setCounty] = useState('')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(
    async (zipFilter: string, countyFilter: string) => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (zipFilter.trim()) {
        params.set('zip', zipFilter.trim())
      }
      if (countyFilter) {
        params.set('county', countyFilter)
      }

      try {
        const res = await fetch(`/api/analytics?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const json: AnalyticsData = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchAnalytics('', '')
  }, [fetchAnalytics])

  function handleApply() {
    fetchAnalytics(zipInput, county)
  }

  function handleClear() {
    setZipInput('')
    setCounty('')
    fetchAnalytics('', '')
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="mt-1 text-muted-foreground">
          Market overview and territory insights.
        </p>
      </div>

      {/* Territory filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            ZIP Codes (comma-separated)
          </label>
          <Input
            placeholder="e.g. 90210, 90211"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply()
            }}
          />
        </div>

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

        <div className="flex gap-2">
          <Button onClick={handleApply}>Apply</Button>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-muted-foreground">
          Loading analytics...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Dashboard content */}
      {data && !loading && (
        <>
          {/* TAM cards */}
          <TamCards totalSites={data.totalSites} byVertical={data.byVertical} />

          {/* Two-column layout: vertical chart + confidence pie */}
          <div className="grid gap-6 lg:grid-cols-2">
            <VerticalChart data={data.byVertical} />
            <ConfidenceChart data={data.byConfidence} />
          </div>

          {/* County table */}
          <CountyTable data={data.byCounty} />
        </>
      )}
    </div>
  )
}
