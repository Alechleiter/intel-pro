import * as XLSX from 'xlsx'

export interface ExportSite {
  Name: string
  Address: string
  City: string
  County: string
  ZIP: string
  Vertical: string
  'Sub-Vertical': string
  Confidence: string
  Status: string
  Chain: string
  'Site Count': number | null
}

export function sitesToExcelBuffer(sites: ExportSite[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(sites)

  // Auto-size columns based on header and content widths
  if (sites.length > 0) {
    const headers = Object.keys(sites[0])
    ws['!cols'] = headers.map((key) => {
      const maxContentLen = sites.reduce((max, row) => {
        const val = String((row as unknown as Record<string, unknown>)[key] ?? '')
        return Math.max(max, val.length)
      }, 0)
      return { wch: Math.max(key.length, maxContentLen) + 2 }
    })
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sites')
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
