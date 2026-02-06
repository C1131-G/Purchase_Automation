import { type ColumnFiltersState } from '@tanstack/react-table'

const normalizeFilterValue = (value: unknown): unknown | null => {
    if (Array.isArray(value)) return value.length > 0 ? value : null
    if (value && typeof value === 'object') {
        const candidate = value as { from?: unknown; to?: unknown; operator?: unknown; value?: unknown }
        if ('from' in candidate || 'to' in candidate) {
            const from = typeof candidate.from === 'string' && candidate.from !== '' ? candidate.from : undefined
            const to = typeof candidate.to === 'string' && candidate.to !== '' ? candidate.to : undefined
            if (!from && !to) return null
            const normalized: { from?: string; to?: string } = {}
            if (from) normalized.from = from
            if (to) normalized.to = to
            return normalized
        }
        if ('operator' in candidate || 'value' in candidate) {
            const operator = candidate.operator
            const numericValue = typeof candidate.value === 'number'
                ? candidate.value
                : Number(candidate.value)
            if (operator !== 'eq' && operator !== 'lt' && operator !== 'gt') return null
            if (!Number.isFinite(numericValue)) return null
            return { operator, value: numericValue }
        }
        return null
    }
    if (value === '' || value === null || value === undefined) return null
    return value
}

export const hasFilterValue = (value: unknown): boolean => {
    return normalizeFilterValue(value) !== null
}

export const normalizeColumnFilters = (
    filters: ColumnFiltersState | undefined,
): ColumnFiltersState => {
    if (!filters) return []
    return filters
        .map((filter) => {
            const normalizedValue = normalizeFilterValue(filter.value)
            if (normalizedValue === null) return null
            return {
                id: filter.id,
                value: normalizedValue,
            }
        })
        .filter((filter): filter is ColumnFiltersState[number] => filter !== null)
}
