import { useMemo } from 'react'

import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { filterAndRankLookups } from '@/features/create-pages/grpo-create/utils/grpo-create.utils'

interface UseGrpoLookupsProps {
  vendors: LookupItem[]
  warehouses: LookupItem[]
  buyers: LookupItem[]
  vendorNameInput: string
  vendorCodeInput: string
  warehouseInput: string
  buyerInput: string
}

export function useGrpoLookups({
  vendors,
  warehouses,
  buyers,
  vendorNameInput,
  vendorCodeInput,
  warehouseInput,
  buyerInput,
}: UseGrpoLookupsProps) {
  const vendorNameSuggestions = useMemo(
    () => filterAndRankLookups(vendors, vendorNameInput).slice(0, 100),
    [vendors, vendorNameInput],
  )
  const vendorCodeSuggestions = useMemo(
    () => filterAndRankLookups(vendors, vendorCodeInput).slice(0, 100),
    [vendors, vendorCodeInput],
  )
  const warehouseSuggestions = useMemo(
    () => filterAndRankLookups(warehouses, warehouseInput).slice(0, 100),
    [warehouses, warehouseInput],
  )
  const buyerSuggestions = useMemo(
    () => filterAndRankLookups(buyers, buyerInput).slice(0, 100),
    [buyers, buyerInput],
  )

  return {
    vendorNameSuggestions,
    vendorCodeSuggestions,
    warehouseSuggestions,
    buyerSuggestions,
  }
}
