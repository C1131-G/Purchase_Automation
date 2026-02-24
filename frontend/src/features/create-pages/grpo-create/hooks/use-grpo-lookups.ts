import { useMemo } from 'react'

import {
  type LookupItem,
  type ProductLookupItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'

interface UseGrpoLookupsProps {
  vendors: LookupItem[]
  warehouses: LookupItem[]
  buyers: LookupItem[]
  vendorsLoading: boolean
  warehousesLoading: boolean
  buyersLoading: boolean
  vendorNameInput: string
  vendorCodeInput: string
  warehouseInput: string
  buyerInput: string
}

export function useGrpoLookups({
  vendors,
  warehouses,
  buyers,
  vendorsLoading,
  warehousesLoading,
  buyersLoading,
  vendorNameInput,
  vendorCodeInput,
  warehouseInput,
  buyerInput,
}: UseGrpoLookupsProps) {
  const INLINE_SUGGESTION_INITIAL_LIMIT = 10
  const INLINE_SUGGESTION_BACKGROUND_LIMIT = 100

  const rankLookupOptions = (items: ProductLookupItem[], rawSearch: string) => {
    const term = rawSearch.trim().toLowerCase()
    if (!term) return items

    const score = (item: ProductLookupItem) => {
      const code = item.code.toLowerCase()
      const name = item.name.toLowerCase()
      if (code === term || name === term) return 0
      if (code.startsWith(term) || name.startsWith(term)) return 1
      if (code.includes(term) || name.includes(term)) return 2
      return 3
    }

    return [...items].sort((a, b) => {
      const byScore = score(a) - score(b)
      if (byScore !== 0) return byScore
      return a.code.localeCompare(b.code, undefined, { sensitivity: 'base', numeric: true })
    })
  }

  const limitInlineSuggestions = (items: ProductLookupItem[], input: string, loading: boolean) => {
    if (input.trim()) return items
    return items.slice(
      0,
      loading ? INLINE_SUGGESTION_INITIAL_LIMIT : INLINE_SUGGESTION_BACKGROUND_LIMIT,
    )
  }

  const vendorNameSuggestions = useMemo(
    () =>
      limitInlineSuggestions(
        rankLookupOptions(vendors as ProductLookupItem[], vendorNameInput),
        vendorNameInput,
        vendorsLoading,
      ),
    [vendorNameInput, vendors, vendorsLoading],
  )
  const vendorCodeSuggestions = useMemo(
    () =>
      limitInlineSuggestions(
        rankLookupOptions(vendors as ProductLookupItem[], vendorCodeInput),
        vendorCodeInput,
        vendorsLoading,
      ),
    [vendorCodeInput, vendors, vendorsLoading],
  )
  const warehouseSuggestions = useMemo(
    () =>
      limitInlineSuggestions(
        rankLookupOptions(warehouses as ProductLookupItem[], warehouseInput),
        warehouseInput,
        warehousesLoading,
      ),
    [warehouseInput, warehouses, warehousesLoading],
  )
  const buyerSuggestions = useMemo(
    () =>
      limitInlineSuggestions(
        rankLookupOptions(buyers as ProductLookupItem[], buyerInput),
        buyerInput,
        buyersLoading,
      ),
    [buyerInput, buyers, buyersLoading],
  )

  return {
    vendorNameSuggestions,
    vendorCodeSuggestions,
    warehouseSuggestions,
    buyerSuggestions,
  }
}
