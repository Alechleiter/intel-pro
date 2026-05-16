'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

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

interface PreviewData {
  sourceType: string
  totalRecords: number
  previewRows: PreviewRow[]
}

interface ImportResult {
  importId: string
  totalRecords: number
  classified: number
  needsReview: number
  errors: string[]
}

const SOURCE_OPTIONS = [
  { value: 'auto', label: 'Auto-Detect' },
  { value: 'ABC', label: 'ABC' },
  { value: 'CalHHS', label: 'CalHHS' },
  { value: 'RCFE', label: 'RCFE' },
  { value: 'CDE_PUBLIC', label: 'CDE (Public)' },
  { value: 'CDE_PRIVATE', label: 'CDE (Private)' },
  { value: 'SNAP', label: 'SNAP' },
  { value: 'LIHTC', label: 'LIHTC' },
  { value: 'HUD', label: 'HUD' },
  { value: 'PHA', label: 'PHA' },
]

interface UploadFormProps {
  onPreview: (data: PreviewData, csvText: string) => void
  onImportComplete: () => void
}

export function UploadForm({ onPreview, onImportComplete }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [sourceOverride, setSourceOverride] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setResult(null)
    setError(null)
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const csvText = await file.text()
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, sourceOverride }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Preview failed')
      }

      const data: PreviewData = await res.json()
      onPreview(data, csvText)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (sourceOverride !== 'auto') {
        formData.append('sourceOverride', sourceOverride)
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }

      const data: ImportResult = await res.json()
      setResult(data)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onImportComplete()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="size-5" />
          Upload CSV
        </CardTitle>
        <CardDescription>
          Upload a CSV file to classify and import site records into the
          database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">
                CSV File
              </label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="mb-1.5 block text-sm font-medium">
                Source Type
              </label>
              <Select value={sourceOverride} onValueChange={(v) => setSourceOverride(v ?? 'auto')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!file || loading || importing}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Previewing...
                </>
              ) : (
                <>
                  <FileText />
                  Preview
                </>
              )}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || loading || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload />
                  Import
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-2 rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-4 shrink-0" />
                Import completed successfully
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Total: {result.totalRecords}
                </Badge>
                <Badge variant="secondary">
                  Classified: {result.classified}
                </Badge>
                {result.needsReview > 0 && (
                  <Badge variant="outline">
                    Needs Review: {result.needsReview}
                  </Badge>
                )}
                {result.errors.length > 0 && (
                  <Badge variant="destructive">
                    Errors: {result.errors.length}
                  </Badge>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded border bg-muted/50 p-2 text-xs text-muted-foreground">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="mt-1 font-medium">
                      ...and {result.errors.length - 10} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
