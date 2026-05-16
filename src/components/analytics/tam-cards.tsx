'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const VERTICAL_COLORS: Record<string, string> = {
  restaurant: '#ef4444',
  restaurants: '#ef4444',
  bar: '#a855f7',
  bars: '#a855f7',
  hotel: '#3b82f6',
  hotels: '#3b82f6',
  grocery: '#22c55e',
  healthcare: '#14b8a6',
  school: '#f97316',
  schools: '#f97316',
  housing: '#a16207',
  assisted_living: '#ec4899',
  other: '#6b7280',
}

function getVerticalColor(vertical: string): string {
  const key = vertical.toLowerCase()
  return VERTICAL_COLORS[key] ?? VERTICAL_COLORS.other
}

interface VerticalData {
  vertical: string
  count: number
}

interface TamCardsProps {
  totalSites: number
  byVertical: VerticalData[]
}

export function TamCards({ totalSites, byVertical }: TamCardsProps) {
  return (
    <div className="space-y-4">
      {/* Total sites hero card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Addressable Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold tracking-tight">
            {totalSites.toLocaleString()}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            sites across {byVertical.length} verticals
          </p>
        </CardContent>
      </Card>

      {/* Per-vertical cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {byVertical.map((v) => {
          const proportion = totalSites > 0 ? (v.count / totalSites) * 100 : 0
          const color = getVerticalColor(v.vertical)

          return (
            <Card key={v.vertical} size="sm">
              <CardHeader>
                <CardTitle className="text-xs font-medium text-muted-foreground capitalize">
                  {v.vertical}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {v.count.toLocaleString()}
                </div>
                {/* Proportion bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(proportion, 2)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {proportion.toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
