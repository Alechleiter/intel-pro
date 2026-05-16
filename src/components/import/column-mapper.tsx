'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Wand2, CheckCircle2 } from 'lucide-react'

export interface ColumnMapping {
  name: string
  address: string
  city: string
  county: string
  zip: string
  state: string
  licenseType: string
  vertical: string
  bedCount: string
  lat: string
  lng: string
  [key: string]: string
}

interface ColumnMapperProps {
  headers: string[]
  sampleRows: Record<string, string>[]
  onConfirm: (mapping: ColumnMapping) => void
  onCancel: () => void
}

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Site Name', hint: 'Business or facility name', required: true },
]

const OPTIONAL_FIELDS = [
  { key: 'address', label: 'Address', hint: 'Street address', required: false },
  { key: 'city', label: 'City', hint: '', required: false },
  { key: 'zip', label: 'ZIP Code', hint: '5-digit ZIP', required: false },
  { key: 'county', label: 'County', hint: '', required: false },
  { key: 'state', label: 'State', hint: 'Usually CA', required: false },
  { key: 'licenseType', label: 'License Type', hint: 'For ABC data', required: false },
  { key: 'vertical', label: 'Category', hint: 'If already categorized', required: false },
  { key: 'bedCount', label: 'Bed Count', hint: 'Number of beds', required: false },
  { key: 'lat', label: 'Latitude', hint: '', required: false },
  { key: 'lng', label: 'Longitude', hint: '', required: false },
]

const AUTO_MATCH_PATTERNS: Record<string, RegExp[]> = {
  name: [
    /^dba[_\s]*name$/i, /^dba$/i,
    /premises[_\s]*name/i, /primary[_\s]*name/i,
    /facility[_\s]*name/i, /facname/i,
    /bus(iness)?[_\s]*name/i, /store[_\s]*name/i,
    /company/i, /^name$/i, /school/i,
    /snap[_\s]*store/i, /hud[_\s]*property/i, /project[_\s]*name/i,
  ],
  address: [
    /dba[_\s]*addr/i, /facility[_\s]*addr/i,
    /prem[_\s]*addr/i, /premises[_\s]*addr/i,
    /^address\d?$/i, /street/i, /^addr$/i, /location/i,
  ],
  city: [/dba[_\s]*city/i, /facility[_\s]*city/i, /prem[_\s]*city/i, /premises[_\s]*city/i, /^city$/i],
  county: [/county[_\s]*name/i, /prem[_\s]*county/i, /^county$/i, /^cnty$/i],
  zip: [
    /dba[_\s]*zip/i, /facility[_\s]*zip/i,
    /prem[_\s]*zip/i, /premises[_\s]*zip/i,
    /^zip[_\s]*code$/i, /^zip$/i, /postal/i, /^zipcode$/i,
  ],
  state: [/facility[_\s]*state/i, /prem[_\s]*state/i, /^state$/i],
  licenseType: [
    /license[_\s]*type/i, /license[_\s]*cat/i,
    /lic[_\s]*type/i, /type[_\s]*code/i, /lic_type/i,
  ],
  vertical: [
    /facility[_\s]*level/i, /facility[_\s]*type/i, /fac[_\s]*fdr/i,
    /^category$/i, /^vertical$/i, /^classification$/i,
    /bed[_\s]*capacity[_\s]*type/i,
  ],
  bedCount: [
    /total[_\s]*number[_\s]*beds/i, /bed[_\s]*capacity$/i,
    /^beds$/i, /^bed[_\s]*count$/i, /facility[_\s]*capacity/i,
    /^capacity$/i,
  ],
  lat: [/^lat(itude)?$/i],
  lng: [/^lng$/i, /^lon(gitude)?$/i, /^long$/i],
}

export function autoMatchHeaders(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}
  const used = new Set<string>()

  for (const [field, patterns] of Object.entries(AUTO_MATCH_PATTERNS)) {
    let matched = false
    for (const pattern of patterns) {
      for (const header of headers) {
        const trimmed = header.trim()
        if (used.has(trimmed)) continue
        if (pattern.test(trimmed)) {
          mapping[field] = trimmed
          used.add(trimmed)
          matched = true
          break
        }
      }
      if (matched) break
    }
  }

  return mapping
}

export function ColumnMapper({ headers, sampleRows, onConfirm, onCancel }: ColumnMapperProps) {
  const autoMatched = useMemo(() => autoMatchHeaders(headers), [headers])
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(() => autoMatched)

  const autoMatchCount = Object.keys(autoMatched).length
  const requiredMapped = REQUIRED_FIELDS.filter(f => mapping[f.key]).length

  const updateMapping = (field: string, header: string | null) => {
    setMapping(prev => ({ ...prev, [field]: !header || header === 'none' ? '' : header }))
  }

  const isValid = REQUIRED_FIELDS.every(f => mapping[f.key])

  const handleConfirm = () => {
    if (!isValid) return
    onConfirm(mapping as ColumnMapping)
  }

  const getPreviewValue = (header: string) => {
    if (!header || !sampleRows[0]) return ''
    return String(sampleRows[0][header] || '').slice(0, 60) || '(empty)'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-5" />
          Map Your Columns
        </CardTitle>
        <CardDescription>
          Tell us which CSV column matches each field.
          {autoMatchCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {autoMatchCount} auto-detected
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {/* Status bar */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            {isValid ? (
              <>
                <CheckCircle2 className="size-4 text-green-600" />
                <span className="text-green-700 dark:text-green-400">All required fields mapped — ready to import</span>
              </>
            ) : (
              <>
                <span className="font-medium">{requiredMapped} / {REQUIRED_FIELDS.length}</span>
                <span className="text-muted-foreground">required fields mapped</span>
              </>
            )}
          </div>

          {/* Required fields */}
          <div>
            <h4 className="mb-2 text-sm font-semibold">Required Fields</h4>
            <div className="space-y-3">
              {REQUIRED_FIELDS.map(field => (
                <FieldRow
                  key={field.key}
                  field={field}
                  headers={headers}
                  value={mapping[field.key] || ''}
                  preview={getPreviewValue(mapping[field.key] || '')}
                  onChange={(v) => updateMapping(field.key, v)}
                  autoMatched={!!autoMatched[field.key]}
                  required
                />
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Optional Fields</h4>
            <div className="space-y-3">
              {OPTIONAL_FIELDS.map(field => (
                <FieldRow
                  key={field.key}
                  field={field}
                  headers={headers}
                  value={mapping[field.key] || ''}
                  preview={getPreviewValue(mapping[field.key] || '')}
                  onChange={(v) => updateMapping(field.key, v)}
                  autoMatched={!!autoMatched[field.key]}
                  required={false}
                />
              ))}
            </div>
          </div>

          {/* Live preview */}
          {sampleRows.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">PREVIEW — FIRST ROW WITH YOUR MAPPING</h4>
              <div className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2 sm:gap-x-4">
                {REQUIRED_FIELDS.concat(OPTIONAL_FIELDS).map(f => {
                  const header = mapping[f.key]
                  const val = header ? getPreviewValue(header) : ''
                  return (
                    <div key={f.key} className="flex gap-2">
                      <span className="shrink-0 font-medium text-muted-foreground">{f.label}:</span>
                      <span className={`truncate ${val ? '' : 'italic text-muted-foreground/50'}`}>
                        {val || '(not mapped)'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!isValid}>
              <ArrowRight className="size-4" />
              Confirm & Start Import
            </Button>
            {!isValid && (
              <span className="self-center text-xs text-destructive">
                Map all required fields to continue
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FieldRow({
  field,
  headers,
  value,
  preview,
  onChange,
  autoMatched,
  required,
}: {
  field: { key: string; label: string; hint: string }
  headers: string[]
  value: string
  preview: string
  onChange: (v: string | null) => void
  autoMatched: boolean
  required: boolean
}) {
  const hasValue = !!value

  const noneLabel = required ? 'Select a column...' : 'None'

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0">
        <div className="flex items-center gap-1 text-sm font-medium">
          {field.label}
          {required && <span className="text-destructive">*</span>}
        </div>
        {field.hint && <div className="text-xs text-muted-foreground">{field.hint}</div>}
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      <div className="w-56">
        <Select value={value || 'none'} onValueChange={onChange}>
          <SelectTrigger className={`w-full ${required && !hasValue ? 'border-destructive/50' : ''}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {noneLabel}
            </SelectItem>
            {headers.map(h => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {hasValue && <span className="truncate max-w-48">"{preview}"</span>}
        {autoMatched && <Badge variant="outline" className="text-xs">auto</Badge>}
      </div>
    </div>
  )
}
