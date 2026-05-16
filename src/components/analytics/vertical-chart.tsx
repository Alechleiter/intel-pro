'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

interface VerticalChartProps {
  data: VerticalData[]
}

export function VerticalChart({ data }: VerticalChartProps) {
  // Sort descending by count
  const sorted = [...data].sort((a, b) => b.count - a.count)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sites by Vertical</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(sorted.length * 44, 200)}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="vertical"
              width={110}
              tick={{ fontSize: 13 }}
              style={{ textTransform: 'capitalize' }}
            />
            <Tooltip
              formatter={(value) => [
                typeof value === 'number' ? value.toLocaleString() : String(value ?? ''),
                'Sites',
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {sorted.map((entry) => (
                <Cell
                  key={entry.vertical}
                  fill={getVerticalColor(entry.vertical)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
