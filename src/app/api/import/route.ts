import { NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { db } from '@/db'
import { imports } from '@/db/schema'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const { fileName, sourceType, totalRecords } = await request.json()
      const importId = ulid()

      await db.insert(imports).values({
        id: importId,
        sourceName: sourceType,
        fileName: fileName || 'unknown.csv',
        recordCount: totalRecords || 0,
        importedBy: 'web_upload',
      })

      return NextResponse.json({ importId })
    }

    // Legacy: handle FormData upload for small files
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    const { importCsv } = await import('@/lib/import/import-sites')
    const csvText = await file.text()
    const sourceOverride = formData.get('sourceOverride') as string | null
    const override = sourceOverride && sourceOverride !== 'auto' ? sourceOverride as any : undefined
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
