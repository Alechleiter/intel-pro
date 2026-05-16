'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#22c55e',
  medium: '#eab308',
  low: '#ef4444',
}

interface ConfidenceData {
  confidence: string
  count: number
}

interface ConfidenceChartProps {
  data: ConfidenceData[]
}

export function ConfidenceChart({ data }: ConfidenceChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  const chartData = data.map((d) => ({
    name: d.confidence.charAt(0).toUpperCase() + d.confidence.slice(1),
    value: d.count,
    percent: total > 0 ? ((d.count / total) * 100).toFixed(1) : '0',
    color: CONFIDENCE_COLORS[d.confidence.toLowerCase()] ?? '#6b7280',
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confidence Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${percent}%`}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                typeof value === 'number' ? value.toLocaleString() : String(value ?? ''),
                String(name),
              ]}
            />
            <Legend
              formatter={(value: string) => {
                const item = chartData.find((d) => d.name === value)
                return `${value} (${item?.value.toLocaleString() ?? 0} - ${item?.percent ?? 0}%)`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
