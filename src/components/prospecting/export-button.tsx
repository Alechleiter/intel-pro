'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExportButtonProps {
  /** Current filter params to pass to the export API */
  filterParams: URLSearchParams
  /** Currently selected site IDs */
  selectedIds: Set<string>
}

export function ExportButton({ filterParams, selectedIds }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function triggerDownload(url: string) {
    setLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      // Extract filename from Content-Disposition header, or use default
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="(.+)"/)
      a.download = match?.[1] ?? 'intel-pro-export.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleExportFiltered() {
    const url = `/api/export?${filterParams.toString()}`
    triggerDownload(url)
  }

  function handleExportSelected() {
    const params = new URLSearchParams()
    params.set('ids', Array.from(selectedIds).join(','))
    const url = `/api/export?${params.toString()}`
    triggerDownload(url)
  }

  const hasSelection = selectedIds.size > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" disabled={loading} />}
      >
        <Download className="mr-2 size-4" />
        {loading ? 'Exporting...' : 'Export'}
        <ChevronDown className="ml-1 size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportFiltered}>
          Export All (Filtered)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={hasSelection ? handleExportSelected : undefined}
          className={hasSelection ? '' : 'pointer-events-none opacity-50'}
        >
          Export Selected{hasSelection ? ` (${selectedIds.size})` : ''}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
