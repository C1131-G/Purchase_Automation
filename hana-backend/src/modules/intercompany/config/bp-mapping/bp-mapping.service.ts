import { createBpMappingQueries, type BpMappingQueries } from "./bp-mapping.queries";
import type { IcBpMapping, IcBpMappingWithCompanies } from "./bp-mapping.types";

export type BpMappingService = {
  findByBuyerAndVendorCode: (
    buyerCompanyId: number,
    vendorCode: string,
  ) => Promise<IcBpMapping | null>;
  listActiveForCompany: (companyId: number) => Promise<IcBpMappingWithCompanies[]>;
};

export const createBpMappingService = (
  queries: BpMappingQueries = createBpMappingQueries(),
): BpMappingService => ({
  findByBuyerAndVendorCode: (buyerCompanyId, vendorCode) =>
    queries.findByBuyerAndVendorCode(buyerCompanyId, vendorCode),
  listActiveForCompany: (companyId) => queries.listActiveForCompany(companyId),
});

export const bpMappingService = createBpMappingService();
