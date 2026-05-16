'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { History, Loader2 } from 'lucide-react'

interface ImportRecord {
  id: string
  sourceName: string
  fileName: string
  recordCount: number | null
  importedAt: string | null
  importedBy: string | null
}

interface ImportHistoryProps {
  refreshKey: number
}

export function ImportHistory({ refreshKey }: ImportHistoryProps) {
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchImports() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/imports')
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to fetch')
        }
        const data = await res.json()
        setImports(data.imports)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchImports()
  }, [refreshKey])

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          Import History
        </CardTitle>
        <CardDescription>Previous data imports</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading...
          </div>
        ) : error ? (
          <div className="py-4 text-center text-sm text-destructive">
            {error}
          </div>
        ) : imports.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No imports yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Record Count</TableHead>
                <TableHead>Imported By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.importedAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.sourceName}</Badge>
                  </TableCell>
                  <TableCell className="max-w-48 truncate font-medium">
                    {row.fileName}
                  </TableCell>
                  <TableCell>{row.recordCount ?? '-'}</TableCell>
                  <TableCell>{row.importedBy ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
