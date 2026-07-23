import type { TaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import { createTaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import { buildArDraftPayload } from "./build-ar-draft.payload";
import type { BuildArDraftResult } from "./build-ar-draft.types";

export type BuildArDraftService = {
  build: (params: {
    partner: ResolvePartnerResult;
    input: IcPoHookInput;
    remarksTag: string;
  }) => Promise<BuildArDraftResult>;
};

export const createBuildArDraftService = (deps?: {
  taxMapping?: TaxMappingService;
}): BuildArDraftService => {
  const taxMapping = deps?.taxMapping ?? createTaxMappingService();

  return {
    build: async ({ partner, input, remarksTag }) => {
      const sourceCompanyId = partner.buyerCompany.companyId;
      const targetCompanyId = partner.sellerCompany.companyId;

      return buildArDraftPayload({
        buyerCustomerCode: partner.buyerCustomerCode,
        comments: input.remarks,
        defaultBranchId: partner.sellerCompany.defaultBranchId,
        docDate: input.docDate,
        docDueDate: input.docDueDate,
        lines: input.lines,
        mapTaxCode: async (sourceTaxCode) => {
          const mapped = await taxMapping.mapTax(sourceCompanyId, targetCompanyId, sourceTaxCode);
          return mapped.hit ? mapped.targetTaxCode : sourceTaxCode;
        },
        numAtCard: input.numAtCard,
        remarksTag,
      });
    },
  };
};

export const buildArDraftService = createBuildArDraftService();
