import { NextRequest, NextResponse } from 'next/server'
import { importCsv } from '@/lib/import/import-sites'
import type { SourceType } from '@/lib/import/parse-csv'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sourceOverride = formData.get('sourceOverride') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No CSV file provided' },
        { status: 400 },
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 },
      )
    }

    const csvText = await file.text()
    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 },
      )
    }

    const override =
      sourceOverride && sourceOverride !== 'auto'
        ? (sourceOverride as SourceType)
        : undefined

    const result = await importCsv(csvText, file.name, 'web_upload', override)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json(
      { error: `Import failed: ${(err as Error).message}` },
      { status: 500 },
    )
  }
}
