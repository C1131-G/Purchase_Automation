import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { parseDocTotalFilterValue } from '@/features/table-pages/shared/components/filters/table-search.validation'
import {
  type NumberComparisonFilter,
  type NumberComparisonOperator,
} from '@/features/table-pages/shared/utils/table-filter-values'

export const sortLookupByCodeDesc = (items: LookupItem[]): LookupItem[] =>
  [...items].sort((a, b) => {
    const aNum = Number(a.code)
    const bNum = Number(b.code)
    const aIsNum = Number.isFinite(aNum)
    const bIsNum = Number.isFinite(bNum)
    if (aIsNum && bIsNum) return bNum - aNum
    return b.code.localeCompare(a.code, undefined, { numeric: true, sensitivity: 'base' })
  })

export const toDateOnly = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(`${dateStr}T00:00:00`)
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

export const toNumberComparisonFilter = (
  operator: NumberComparisonOperator,
  rawValue: string,
): NumberComparisonFilter | null => {
  const parsed = parseDocTotalFilterValue(rawValue.trim())
  if (parsed === null) return null
  return { operator, value: parsed }
}
