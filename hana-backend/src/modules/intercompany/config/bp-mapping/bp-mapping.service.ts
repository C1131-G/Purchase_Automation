import { createBpMappingQueries, type BpMappingQueries } from "./bp-mapping.queries";
import type { IcBpMapping } from "./bp-mapping.types";

export type BpMappingService = {
  findByBuyerAndVendorCode: (
    buyerCompanyId: number,
    vendorCode: string,
  ) => Promise<IcBpMapping | null>;
};

export const createBpMappingService = (
  queries: BpMappingQueries = createBpMappingQueries(),
): BpMappingService => ({
  findByBuyerAndVendorCode: (buyerCompanyId, vendorCode) =>
    queries.findByBuyerAndVendorCode(buyerCompanyId, vendorCode),
});

export const bpMappingService = createBpMappingService();
