import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { parseDocTotalFilterValue } from '@/features/table-pages/table-shared/components/filters/table-search.validation'
import {
  type NumberComparisonFilter,
  type NumberComparisonOperator,
} from '@/features/table-pages/table-shared/utils/table-filter-values'

export const sortLookupByCodeDesc = (items: LookupItem[]): LookupItem[] =>
  [...items].sort((a, b) => {
    const aNum = Number(a.code)
    const bNum = Number(b.code)
    const aIsNum = Number.isFinite(aNum)
    const bIsNum = Number.isFinite(bNum)
    if (aIsNum && bIsNum) return bNum - aNum
    return b.code.localeCompare(a.code, undefined, { numeric: true, sensitivity: 'base' })
  })

type LookupPriorityMode = 'code' | 'name' | 'both'

const getLookupMatchScore = (item: LookupItem, term: string, mode: LookupPriorityMode): number => {
  if (!term) return 0

  const code = item.code.toLowerCase()
  const name = item.name.toLowerCase()
  const codeMatch = code.includes(term)
  const nameMatch = name.includes(term)

  if (mode === 'code') {
    if (code === term) return 0
    if (code.startsWith(term)) return 1
    if (codeMatch) return 2
    if (nameMatch) return 3
    return 4
  }

  if (mode === 'name') {
    if (name === term) return 0
    if (name.startsWith(term)) return 1
    if (nameMatch) return 2
    if (codeMatch) return 3
    return 4
  }

  if (code === term || name === term) return 0
  if (code.startsWith(term) || name.startsWith(term)) return 1
  if (codeMatch || nameMatch) return 2
  return 3
}

export const rankLookupSuggestions = (
  items: LookupItem[],
  rawSearch: string,
  mode: LookupPriorityMode = 'both',
): LookupItem[] => {
  const term = rawSearch.trim().toLowerCase()
  if (!term) return items

  const matchesByMode = (item: LookupItem) => {
    const code = item.code.toLowerCase()
    const name = item.name.toLowerCase()
    if (mode === 'code') return code.includes(term) || name.includes(term)
    if (mode === 'name') return name.includes(term) || code.includes(term)
    return code.includes(term) || name.includes(term)
  }

  return items.filter(matchesByMode).sort((a, b) => {
    const byScore = getLookupMatchScore(a, term, mode) - getLookupMatchScore(b, term, mode)
    if (byScore !== 0) return byScore
    return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
  })
}

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
