'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Eye } from 'lucide-react'

interface PreviewRow {
  name: string
  address: string
  city: string
  zip: string
  vertical: string
  subVertical: string
  confidence: string
  status: string
}

interface PreviewTableProps {
  sourceType: string
  totalRecords: number
  rows: PreviewRow[]
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  switch (confidence) {
    case 'high':
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-600">
          High
        </Badge>
      )
    case 'medium':
      return (
        <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">
          Medium
        </Badge>
      )
    case 'low':
      return (
        <Badge className="bg-red-500 text-white hover:bg-red-500">Low</Badge>
      )
    default:
      return <Badge variant="secondary">{confidence}</Badge>
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-600">
          Active
        </Badge>
      )
    case 'needs_review':
      return (
        <Badge className="bg-orange-500 text-white hover:bg-orange-500">
          Needs Review
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function PreviewTable({
  sourceType,
  totalRecords,
  rows,
}: PreviewTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="size-5" />
          Preview
        </CardTitle>
        <CardDescription>
          Detected source: <strong>{sourceType}</strong> &middot; Showing{' '}
          {rows.length} of {totalRecords} total records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>ZIP</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Sub-Vertical</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="max-w-48 truncate font-medium">
                  {row.name}
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {row.address}
                </TableCell>
                <TableCell>{row.city}</TableCell>
                <TableCell>{row.zip}</TableCell>
                <TableCell>{row.vertical}</TableCell>
                <TableCell>{row.subVertical}</TableCell>
                <TableCell>
                  <ConfidenceBadge confidence={row.confidence} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
