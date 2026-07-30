/** Lazy bill/ship address options for the active vendor/customer on create pages. */
import { useQuery } from "@tanstack/react-query";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";

export type PartnerAddressOption = {
  addressName: string;
  addressText: string;
  addressType: "B" | "S";
};

/**
 * Fetches full address list for `cardCode` (list master-data omits addresses[]).
 * Returns empty option arrays until the code is set and the query resolves.
 */
export function usePartnerAddressOptions(cardCode?: string | null): {
  billToOptions: PartnerAddressOption[];
  shipToOptions: PartnerAddressOption[];
  isLoading: boolean;
} {
  const code = String(cardCode ?? "").trim();
  const query = useQuery(createSharedQueries.businessPartnerAddresses(code || undefined));

  const addresses = query.data?.addresses ?? [];
  const billToOptions: PartnerAddressOption[] = [];
  const shipToOptions: PartnerAddressOption[] = [];

  for (const addr of addresses) {
    const option: PartnerAddressOption = {
      addressName: addr.addressName,
      addressText: addr.addressText,
      addressType: addr.addressType,
    };
    if (addr.addressType === "B") {
      billToOptions.push(option);
    } else if (addr.addressType === "S") {
      shipToOptions.push(option);
    }
  }

  return {
    billToOptions,
    shipToOptions,
    isLoading: Boolean(code) && query.isLoading,
  };
}
