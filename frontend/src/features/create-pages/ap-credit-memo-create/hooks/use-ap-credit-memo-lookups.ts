import { useMemo } from "react";

import type {
  LookupItem,
  ProductLookupItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import { rankAndLimitLookupOptions } from "@/features/create-pages/create-shared/utils/rank-lookup-options";

interface UseAPCreditMemoLookupsProps {
  vendors: LookupItem[];
  warehouses: LookupItem[];
  buyers: LookupItem[];
  vendorNameInput: string;
  vendorCodeInput: string;
  warehouseInput: string;
  buyerInput: string;
}

export function useAPCreditMemoLookups({
  vendors,
  warehouses,
  buyers,
  vendorNameInput,
  vendorCodeInput,
  warehouseInput,
  buyerInput,
}: UseAPCreditMemoLookupsProps) {
  const vendorNameSuggestions = useMemo(
    () => rankAndLimitLookupOptions(vendors as ProductLookupItem[], vendorNameInput),
    [vendorNameInput, vendors],
  );
  const vendorCodeSuggestions = useMemo(
    () => rankAndLimitLookupOptions(vendors as ProductLookupItem[], vendorCodeInput),
    [vendorCodeInput, vendors],
  );
  const warehouseSuggestions = useMemo(
    () => rankAndLimitLookupOptions(warehouses as ProductLookupItem[], warehouseInput),
    [warehouseInput, warehouses],
  );
  const buyerSuggestions = useMemo(
    () => rankAndLimitLookupOptions(buyers as ProductLookupItem[], buyerInput),
    [buyerInput, buyers],
  );

  return {
    buyerSuggestions,
    vendorCodeSuggestions,
    vendorNameSuggestions,
    warehouseSuggestions,
  };
}
