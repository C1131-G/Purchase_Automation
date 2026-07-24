import type { TaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import { createTaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
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
      let taxMapped = 0;
      let taxFallback = 0;
      const fallbackCodes = new Set<string>();
      const mappedPairs = new Set<string>();

      const payload = await buildArDraftPayload({
        buyerCustomerCode: partner.buyerCustomerCode,
        comments: input.remarks,
        defaultBranchId: partner.sellerCompany.defaultBranchId,
        docDate: input.docDate,
        docDueDate: input.docDueDate,
        lines: input.lines,
        mapTaxCode: async (sourceTaxCode) => {
          const mapped = await taxMapping.mapTax(sourceCompanyId, targetCompanyId, sourceTaxCode);
          if (mapped.hit) {
            taxMapped += 1;
            mappedPairs.add(`${sourceTaxCode}->${mapped.targetTaxCode}`);
            return mapped.targetTaxCode;
          }
          taxFallback += 1;
          fallbackCodes.add(sourceTaxCode);
          icLog.warn(IC_LOG_SCOPE.TAX, "IC tax map miss; using source tax on partner doc", {
            check: "tax_mapping",
            fallback: sourceTaxCode,
            outcome: "fail",
            sourceCompanyId,
            sourceTaxCode,
            targetCompanyId,
          });
          return sourceTaxCode;
        },
        numAtCard: input.numAtCard,
        remarksTag,
      });

      icLog.info(IC_LOG_SCOPE.TAX, "IC tax map summary for AR draft", {
        check: "tax_mapping_summary",
        fallbackCodes: [...fallbackCodes],
        mappedPairs: [...mappedPairs],
        outcome: taxFallback > 0 ? "fail" : "pass",
        sourceCompanyId,
        targetCompanyId,
        taxFallback,
        taxMapped,
      });

      return payload;
    },
  };
};

export const buildArDraftService = createBuildArDraftService();
