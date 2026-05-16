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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CountyData {
  county: string
  count: number
  topVertical: string
}

interface CountyTableProps {
  data: CountyData[]
}

const DEFAULT_VISIBLE = 20

export function CountyTable({ data }: CountyTableProps) {
  const [showAll, setShowAll] = useState(false)

  // Already sorted descending from API, but ensure it
  const sorted = [...data].sort((a, b) => b.count - a.count)
  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_VISIBLE)

  return (
    <Card>
      <CardHeader>
        <CardTitle>County Ranking</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>County</TableHead>
              <TableHead className="text-right">Total Sites</TableHead>
              <TableHead>Top Vertical</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, i) => (
              <TableRow key={row.county}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{row.county}</TableCell>
                <TableCell className="text-right">
                  {row.count.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {row.topVertical}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No county data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {sorted.length > DEFAULT_VISIBLE && (
          <div className="mt-3 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? 'Show Top 20'
                : `Show All ${sorted.length} Counties`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
