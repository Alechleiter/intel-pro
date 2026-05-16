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

const BATCH_SIZE = 200

interface UploadFormProps {
  onPreview: (data: PreviewData, csvText: string) => void
  onImportComplete: () => void
}

export function UploadForm({ onPreview, onImportComplete }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [sourceOverride, setSourceOverride] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, classified: 0, needsReview: 0, errors: 0 })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setResult(null)
    setError(null)
    setProgress({ current: 0, total: 0, classified: 0, needsReview: 0, errors: 0 })
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
        body: JSON.stringify({ csvText: csvText.slice(0, 50000), sourceOverride }),
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
      const csvText = await file.text()

      // Parse CSV on the client to split into batches
      const lines = csvText.split('\n')
      const header = lines[0]
      const dataLines = lines.slice(1).filter(line => line.trim().length > 0)
      const totalRecords = dataLines.length

      if (totalRecords === 0) {
        throw new Error('No records found in CSV')
      }

      // Detect source type from header
      const headerFields = header.split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''))
      const sourceType = sourceOverride !== 'auto' ? sourceOverride : detectSource(headerFields)

      // Create import record first
      const importRes = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, sourceType, totalRecords }),
      })
      const importData = await importRes.json()
      const importId = importData.importId || 'batch'

      setProgress({ current: 0, total: totalRecords, classified: 0, needsReview: 0, errors: 0 })

      let totalClassified = 0
      let totalNeedsReview = 0
      const allErrors: string[] = []

      // Process in batches
      const totalBatches = Math.ceil(dataLines.length / BATCH_SIZE)
      for (let i = 0; i < totalBatches; i++) {
        const batchLines = dataLines.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
        const batchCsv = header + '\n' + batchLines.join('\n')

        // Parse the batch CSV into records
        const records = parseCsvBatch(batchCsv)

        const res = await fetch('/api/import/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records, sourceType, importId }),
        })

        if (!res.ok) {
          const errData = await res.json()
          allErrors.push(`Batch ${i + 1} failed: ${errData.error}`)
        } else {
          const batchResult = await res.json()
          totalClassified += batchResult.classified || 0
          totalNeedsReview += batchResult.needsReview || 0
          if (batchResult.errors) allErrors.push(...batchResult.errors)
        }

        setProgress({
          current: Math.min((i + 1) * BATCH_SIZE, totalRecords),
          total: totalRecords,
          classified: totalClassified,
          needsReview: totalNeedsReview,
          errors: allErrors.length,
        })
      }

      setResult({
        importId,
        totalRecords,
        classified: totalClassified,
        needsReview: totalNeedsReview,
        errors: allErrors,
      })
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
          Upload a CSV file to classify and import site records into the database.
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

          {/* Progress bar */}
          {importing && progress.total > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Importing... {progress.current.toLocaleString()} / {progress.total.toLocaleString()} records
                </span>
                <span className="text-muted-foreground">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Classified: {progress.classified.toLocaleString()}</span>
                {progress.needsReview > 0 && <span>Needs Review: {progress.needsReview.toLocaleString()}</span>}
                {progress.errors > 0 && <span className="text-destructive">Errors: {progress.errors}</span>}
              </div>
            </div>
          )}

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
                  Total: {result.totalRecords.toLocaleString()}
                </Badge>
                <Badge variant="secondary">
                  Classified: {result.classified.toLocaleString()}
                </Badge>
                {result.needsReview > 0 && (
                  <Badge variant="outline">
                    Needs Review: {result.needsReview.toLocaleString()}
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

function detectSource(headers: string[]): string {
  const sigs: Record<string, string> = {
    'License Type': 'ABC',
    'FACID': 'CalHHS',
    'CDSCode': 'CDE_PUBLIC',
    'SNAP Store Name': 'SNAP',
    'HUD Property Name': 'HUD',
    'Project Name': 'LIHTC',
  }
  for (const h of headers) {
    if (sigs[h]) return sigs[h]
  }
  return 'UNKNOWN'
}

function parseCsvBatch(csvText: string): Record<string, string | number | null>[] {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const records: Record<string, string | number | null>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseCSVLine(line)
    const record: Record<string, string | number | null> = {}
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] ?? null
    }
    records.push(record)
  }

  return records
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())
  return result
}
