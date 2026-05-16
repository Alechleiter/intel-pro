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
import { ArrowRight, Wand2 } from 'lucide-react'

export interface ColumnMapping {
  name: string
  address: string
  city: string
  county: string
  zip: string
  state: string
  licenseType: string
  vertical: string
  [key: string]: string
}

interface ColumnMapperProps {
  headers: string[]
  sampleRows: Record<string, string>[]
  onConfirm: (mapping: ColumnMapping) => void
  onCancel: () => void
}

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Site Name', hint: 'Business name, facility name, school name, etc.' },
  { key: 'address', label: 'Address', hint: 'Street address' },
  { key: 'city', label: 'City', hint: '' },
  { key: 'zip', label: 'ZIP Code', hint: '5-digit ZIP' },
]

const OPTIONAL_FIELDS = [
  { key: 'county', label: 'County', hint: '' },
  { key: 'state', label: 'State', hint: 'Usually CA for all records' },
  { key: 'licenseType', label: 'License Type', hint: 'ABC license type number (for ABC data)' },
  { key: 'vertical', label: 'Vertical/Category', hint: 'If the data already has a category column' },
]

const AUTO_MATCH_PATTERNS: Record<string, RegExp[]> = {
  name: [/^(premises\s*name|bus(iness)?\s*name|facility\s*name|name|school|store\s*name|dba|doing\s*business|company)/i],
  address: [/^(prem(ises)?\s*addr|address|street|addr|location)/i],
  city: [/^(prem(ises)?\s*city|city)/i],
  county: [/^(county|cnty)/i],
  zip: [/^(zip|zip\s*code|postal|prem(ises)?\s*zip)/i],
  state: [/^(state|st)/i],
  licenseType: [/^(lic(ense)?\s*type|type\s*code|lic\s*typ)/i],
  vertical: [/^(category|type|vertical|classification|facility\s*type)/i],
}

function autoMatchHeaders(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}

  for (const [field, patterns] of Object.entries(AUTO_MATCH_PATTERNS)) {
    for (const header of headers) {
      if (patterns.some(p => p.test(header.trim()))) {
        mapping[field] = header
        break
      }
    }
  }

  return mapping
}

export function ColumnMapper({ headers, sampleRows, onConfirm, onCancel }: ColumnMapperProps) {
  const autoMatched = useMemo(() => autoMatchHeaders(headers), [headers])
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(() => autoMatched)

  const autoMatchCount = Object.keys(autoMatched).length

  const updateMapping = (field: string, header: string | null) => {
    setMapping(prev => ({ ...prev, [field]: !header || header === '_skip_' ? '' : header }))
  }

  const isValid = REQUIRED_FIELDS.every(f => mapping[f.key])

  const handleConfirm = () => {
    if (!isValid) return
    onConfirm(mapping as ColumnMapping)
  }

  const getPreviewValue = (header: string) => {
    if (!header || !sampleRows[0]) return '—'
    return String(sampleRows[0][header] || '').slice(0, 50) || '(empty)'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-5" />
          Map Columns
        </CardTitle>
        <CardDescription>
          Match your CSV columns to the fields Intel Pro needs.
          {autoMatchCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {autoMatchCount} auto-matched
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
                />
              ))}
            </div>
          </div>

          {/* Sample data preview */}
          {sampleRows.length > 0 && (
            <div className="rounded border bg-muted/30 p-3">
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">FIRST ROW PREVIEW</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {REQUIRED_FIELDS.concat(OPTIONAL_FIELDS).map(f => {
                  const header = mapping[f.key]
                  if (!header) return null
                  return (
                    <div key={f.key} className="flex gap-2">
                      <span className="font-medium text-muted-foreground">{f.label}:</span>
                      <span className="truncate">{getPreviewValue(header)}</span>
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
              Confirm Mapping & Import
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
}: {
  field: { key: string; label: string; hint: string }
  headers: string[]
  value: string
  preview: string
  onChange: (v: string | null) => void
  autoMatched: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0">
        <div className="text-sm font-medium">{field.label}</div>
        {field.hint && <div className="text-xs text-muted-foreground">{field.hint}</div>}
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      <div className="w-56">
        <Select value={value || '_skip_'} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select column..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_skip_">— Skip —</SelectItem>
            {headers.map(h => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {value && value !== '_skip_' && <span className="truncate max-w-40">"{preview}"</span>}
        {autoMatched && <Badge variant="outline" className="text-xs">auto</Badge>}
      </div>
    </div>
  )
}
