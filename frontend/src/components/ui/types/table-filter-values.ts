export type NumberComparisonOperator = 'eq' | 'lt' | 'gt'

export type DateRangeFilter = {
  from?: string | undefined
  to?: string | undefined
}

export type NumberComparisonFilter = {
  operator: NumberComparisonOperator
  value: number
}

export const isDateRangeFilter = (value: unknown): value is DateRangeFilter => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as { from?: unknown; to?: unknown }
  const fromValid = candidate.from === undefined || typeof candidate.from === 'string'
  const toValid = candidate.to === undefined || typeof candidate.to === 'string'
  return fromValid && toValid
}

export const isNumberComparisonFilter = (value: unknown): value is NumberComparisonFilter => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as { operator?: unknown; value?: unknown }
  const operatorValid =
    candidate.operator === 'eq' || candidate.operator === 'lt' || candidate.operator === 'gt'
  const numericValue =
    typeof candidate.value === 'number' ? candidate.value : Number(candidate.value)
  return operatorValid && Number.isFinite(numericValue)
}

export const toDateRangeFilter = (from?: string, to?: string): DateRangeFilter => {
  const next: DateRangeFilter = {}
  if (from) next.from = from
  if (to) next.to = to
  return next
}

export const normalizeDateRange = (range: DateRangeFilter): DateRangeFilter => {
  if (!range.from || !range.to) return toDateRangeFilter(range.from, range.to)
  return range.from <= range.to
    ? { from: range.from, to: range.to }
    : { from: range.to, to: range.from }
}

export const hasDateRangeValue = (range: DateRangeFilter | null | undefined) =>
  Boolean(range?.from || range?.to)

// matchesDateRange: Strictly typed filter matcher for ISO date strings.
export const matchesDateRange = (rawValue: unknown, filterValue: unknown): boolean => {
  const rowStr = String(rawValue ?? '')
  const rowDate = rowStr.slice(0, 10)
  if (!rowDate) return true

  if (!filterValue || typeof filterValue !== 'object') return true

  const { from, to } = filterValue as DateRangeFilter
  if (!from && !to) return true
  if (from && !to) return rowDate === from
  if (!from && to) return rowDate === to

  const start = from! <= to! ? from! : to!
  const end = from! <= to! ? to! : from!
  return rowDate >= start && rowDate <= end
}

// matchesNumberComparison: Strictly typed filter matcher for numeric/currency columns.
export const matchesNumberComparison = (rowValue: unknown, filterValue: unknown): boolean => {
  const cleanRow =
    typeof rowValue === 'string' ? rowValue.replace(/[^0-9.-]/g, '') : String(rowValue ?? '')
  const parsedRow = parseFloat(cleanRow)
  if (!Number.isFinite(parsedRow)) return false

  if (!filterValue || typeof filterValue !== 'object' || Array.isArray(filterValue)) return true

  const { operator, value: rawValue } = filterValue as {
    operator?: NumberComparisonOperator
    value?: number | string
  }
  const parsed = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue ?? ''))

  if (!operator || !Number.isFinite(parsed)) return true
  if (operator !== 'eq' && operator !== 'lt' && operator !== 'gt') return true

  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
  const left = round(parsedRow)
  const right = round(parsed)

  if (operator === 'eq') return left === right
  if (operator === 'lt') return left < right
  if (operator === 'gt') return left > right
  return true
}
