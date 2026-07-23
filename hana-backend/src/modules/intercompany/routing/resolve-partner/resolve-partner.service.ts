import type { BpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";

import type { ResolvePartnerInput, ResolvePartnerResult } from "./resolve-partner.types";

export type ResolvePartnerService = {
  resolve: (input: ResolvePartnerInput) => Promise<ResolvePartnerResult | null>;
};

export const createResolvePartnerService = (deps?: {
  company?: CompanyService;
  bpMapping?: BpMappingService;
}): ResolvePartnerService => {
  const company = deps?.company ?? createCompanyService();
  const bpMapping = deps?.bpMapping ?? createBpMappingService();

  return {
    resolve: async (input) => {
      const vendorCode = input.cardCode?.trim();
      if (!vendorCode || !input.dbName?.trim()) {
        return null;
      }

      const buyerCompany = await company.getBySapDbName(input.dbName.trim());
      if (!buyerCompany || !buyerCompany.isActive) {
        return null;
      }

      const mapping = await bpMapping.findByBuyerAndVendorCode(buyerCompany.companyId, vendorCode);
      if (!mapping) {
        return null;
      }

      const sellerCompany = await company.getById(mapping.vendorCompanyId);
      if (!sellerCompany || !sellerCompany.isActive) {
        return null;
      }

      return {
        bpMappingId: mapping.mappingId,
        buyerCompany,
        buyerCustomerCode: mapping.buyerCustomerCode,
        sellerCompany,
        vendorCode,
      };
    },
  };
};

export const resolvePartnerService = createResolvePartnerService();
