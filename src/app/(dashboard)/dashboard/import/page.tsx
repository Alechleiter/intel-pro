'use client'

import { useState, useCallback } from 'react'
import { UploadForm } from '@/components/import/upload-form'
import { PreviewTable } from '@/components/import/preview-table'
import { ImportHistory } from '@/components/import/import-history'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

interface PreviewData {
  sourceType: string
  totalRecords: number
  previewRows: {
    name: string
    address: string
    city: string
    zip: string
    vertical: string
    subVertical: string
    confidence: string
    status: string
  }[]
}

export default function ImportPage() {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [historyKey, setHistoryKey] = useState(0)
  const [clearing, setClearing] = useState(false)

  const handlePreview = useCallback(
    (data: PreviewData) => {
      setPreview(data)
    },
    [],
  )

  const handleImportComplete = useCallback(() => {
    setPreview(null)
    setHistoryKey((k) => k + 1)
  }, [])

  const handleClearAll = async () => {
    if (!confirm('This will permanently delete ALL imported sites, source records, contacts, and import history. Are you sure?')) return
    setClearing(true)
    try {
      const res = await fetch('/api/import/clear', { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        alert(`Cleared ${data.deleted.toLocaleString()} records.`)
        setHistoryKey((k) => k + 1)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Failed to clear data.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Import Data</h2>
          <p className="mt-1 text-muted-foreground">
            Upload and import site records from CSV data sources.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAll}
          disabled={clearing}
        >
          {clearing ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4" />}
          {clearing ? 'Clearing...' : 'Clear All Data'}
        </Button>
      </div>

      <UploadForm
        onPreview={handlePreview}
        onImportComplete={handleImportComplete}
      />

      {preview && (
        <>
          <Separator />
          <PreviewTable
            sourceType={preview.sourceType}
            totalRecords={preview.totalRecords}
            rows={preview.previewRows}
          />
        </>
      )}

      <Separator />

      <ImportHistory refreshKey={historyKey} />
    </div>
  )
}
