export function numberValue(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/[,\s円%]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function fiscalYearFor(periodMonth: string): number {
  const [year, month] = periodMonth.split('-').map(Number)
  return month >= 4 ? year : year - 1
}

export function quarterFor(periodMonth: string): string {
  const fiscalYear = fiscalYearFor(periodMonth)
  const month = Number(periodMonth.slice(5, 7))
  if (month >= 4 && month <= 6) return `${fiscalYear}年度Q1`
  if (month >= 7 && month <= 9) return `${fiscalYear}年度Q2`
  if (month >= 10 && month <= 12) return `${fiscalYear}年度Q3`
  return `${fiscalYear}年度Q4`
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuote = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && inQuote && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      inQuote = !inQuote
    } else if (char === ',' && !inQuote) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuote) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)
  const [headers = [], ...records] = rows
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])),
  )
}

export function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key]) return row[key]
  }
  return ''
}

export function isDateText(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isMonthText(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}
