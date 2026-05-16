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
import { Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { ColumnMapper, type ColumnMapping, autoMatchHeaders } from './column-mapper'
import * as XLSX from 'xlsx'

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

const REQUIRED_KEYS = ['name']
const BATCH_SIZE = 500

interface UploadFormProps {
  onPreview: (data: PreviewData, csvText: string) => void
  onImportComplete: () => void
}

type Step = 'upload' | 'mapping' | 'importing' | 'done'

export function UploadForm({ onPreview, onImportComplete }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string>('')
  const [sourceOverride, setSourceOverride] = useState('auto')
  const [step, setStep] = useState<Step>('upload')
  const [loading, setLoading] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0, classified: 0, needsReview: 0, errors: 0 })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [headerIdx, setHeaderIdx] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setResult(null)
    setError(null)
    setStep('upload')
    setProgress({ current: 0, total: 0, classified: 0, needsReview: 0, errors: 0 })
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      let text: string
      const isExcel = /\.xlsx?$/i.test(file.name)

      if (isExcel) {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        text = XLSX.utils.sheet_to_csv(ws)
      } else {
        text = await file.text()
      }

      setCsvText(text)

      const parsed = parseFirstRows(text, 5)
      setHeaders(parsed.headers)
      setSampleRows(parsed.rows)
      setHeaderIdx(parsed.headerIdx)

      const autoMapping = autoMatchHeaders(parsed.headers)
      const allRequiredMapped = REQUIRED_KEYS.every(k => autoMapping[k])

      if (allRequiredMapped) {
        const fullMapping: ColumnMapping = {
          name: autoMapping.name || '',
          address: autoMapping.address || '',
          city: autoMapping.city || '',
          county: autoMapping.county || '',
          zip: autoMapping.zip || '',
          state: autoMapping.state || '',
          licenseType: autoMapping.licenseType || '',
          vertical: autoMapping.vertical || '',
        }
        setStep('importing')
        setLoading(false)
        await runBatchImport(fullMapping, text)
      } else {
        setStep('mapping')
        setLoading(false)
      }
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const handleMappingConfirm = async (mapping: ColumnMapping) => {
    setStep('importing')
    await runBatchImport(mapping, csvText)
  }

  const handleMappingCancel = () => {
    setStep('upload')
  }

  const runBatchImport = async (mapping: ColumnMapping, text: string) => {
    setError(null)
    setResult(null)

    try {
      const lines = text.split('\n')
      const hIdx = findHeaderLine(lines)
      const dataLines = lines.slice(hIdx + 1).filter(line => line.trim().length > 0)
      const totalRecords = dataLines.length

      if (totalRecords === 0) {
        throw new Error('No records found in CSV')
      }

      const headerLine = lines[hIdx]
      const parsedHeaders = parseCSVLine(headerLine).map(h => h.trim())
      const sourceType = sourceOverride !== 'auto' ? sourceOverride : detectSource(parsedHeaders)

      const importRes = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file?.name || 'upload.csv', sourceType, totalRecords }),
      })
      const importData = await importRes.json()
      const importId = importData.importId || 'batch'

      setProgress({ current: 0, total: totalRecords, classified: 0, needsReview: 0, errors: 0 })

      let totalClassified = 0
      let totalNeedsReview = 0
      const allErrors: string[] = []

      const totalBatches = Math.ceil(dataLines.length / BATCH_SIZE)
      for (let i = 0; i < totalBatches; i++) {
        const batchLines = dataLines.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
        const batchCsv = headerLine + '\n' + batchLines.join('\n')
        const records = parseCsvBatch(batchCsv)

        const res = await fetch('/api/import/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records, sourceType, importId, columnMapping: mapping }),
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
      setStep('done')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onImportComplete()
    } catch (err) {
      setError((err as Error).message)
      setStep('upload')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload CSV
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file. Columns are auto-detected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium">CSV File</label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  disabled={step === 'importing'}
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="mb-1.5 block text-sm font-medium">Source Type</label>
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

            <Button
              onClick={handleUpload}
              disabled={!file || loading || step === 'importing'}
              className="w-fit"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Reading file...
                </>
              ) : (
                <>
                  <Upload />
                  Import
                </>
              )}
            </Button>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {step === 'mapping' && (
        <ColumnMapper
          headers={headers}
          sampleRows={sampleRows}
          onConfirm={handleMappingConfirm}
          onCancel={handleMappingCancel}
        />
      )}

      {step === 'importing' && progress.total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Importing... {progress.current.toLocaleString()} / {progress.total.toLocaleString()} records
                </span>
                <span className="text-muted-foreground">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Classified: <strong>{progress.classified.toLocaleString()}</strong></span>
                {progress.needsReview > 0 && <span>Needs Review: <strong>{progress.needsReview.toLocaleString()}</strong></span>}
                {progress.errors > 0 && <span className="text-destructive">Errors: <strong>{progress.errors}</strong></span>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-500/50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-5" />
                Import completed successfully!
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary">Total: {result.totalRecords.toLocaleString()}</Badge>
                <Badge variant="secondary">Classified: {result.classified.toLocaleString()}</Badge>
                {result.needsReview > 0 && <Badge variant="outline">Needs Review: {result.needsReview.toLocaleString()}</Badge>}
                {result.errors.length > 0 && <Badge variant="destructive">Errors: {result.errors.length}</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function detectSource(headers: string[]): string {
  const sigs: Record<string, string> = {
    'License Type': 'ABC', 'LIC_TYPE': 'ABC', 'Lic Type': 'ABC',
    'FACID': 'CalHHS',
    'CDSCode': 'CDE_PUBLIC',
    'SNAP Store Name': 'SNAP',
    'HUD Property Name': 'HUD',
    'Project Name': 'LIHTC',
  }
  for (const h of headers) {
    const trimmed = h.trim().replace(/^"/, '').replace(/"$/, '')
    if (sigs[trimmed]) return sigs[trimmed]
  }
  return 'UNKNOWN'
}

function findHeaderLine(lines: string[]): number {
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const parsed = parseCSVLine(lines[i])
    if (parsed.length >= 3 && parsed.some(h => /addr|name|city|zip|county|license|facid|code/i.test(h.trim()))) {
      return i
    }
  }
  return 0
}

function parseFirstRows(csvText: string, n: number) {
  const lines = csvText.split('\n')
  const headerIdx = findHeaderLine(lines)
  const headers = parseCSVLine(lines[headerIdx]).map(h => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = headerIdx + 1; i <= Math.min(headerIdx + n, lines.length - 1); i++) {
    if (!lines[i]?.trim()) continue
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || ''
    }
    rows.push(row)
  }

  return { headers, rows, headerIdx }
}

function parseCsvBatch(csvText: string): Record<string, string | number | null>[] {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map(h => h.trim())
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
