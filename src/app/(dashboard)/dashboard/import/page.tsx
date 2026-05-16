'use client'

import { useState, useCallback } from 'react'
import { UploadForm } from '@/components/import/upload-form'
import { PreviewTable } from '@/components/import/preview-table'
import { ImportHistory } from '@/components/import/import-history'
import { Separator } from '@/components/ui/separator'

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Import Data</h2>
        <p className="mt-1 text-muted-foreground">
          Upload and import site records from CSV data sources.
        </p>
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
