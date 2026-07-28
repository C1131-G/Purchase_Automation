import type { PartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import { createPartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
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
  company?: CompanyService;
  partnerTax?: PartnerTaxResolver;
}): BuildArDraftService => {
  const company = deps?.company ?? createCompanyService();
  const partnerTax =
    deps?.partnerTax ??
    createPartnerTaxResolver({
      company,
    });

  return {
    build: async ({ partner, input, remarksTag }) => {
      const targetCompanyId = partner.sellerCompany.companyId;
      const targetSapDbName = partner.sellerCompany.sapDbName;
      const targetCardCode = partner.buyerCustomerCode;

      let taxItem = 0;
      let taxBp = 0;
      let taxOmit = 0;
      const resolvedPairs = new Set<string>();

      const built = await buildArDraftPayload({
        buyerCustomerCode: partner.buyerCustomerCode,
        comments: input.remarks,
        defaultBranchId: partner.sellerCompany.defaultBranchId,
        docDate: input.docDate,
        docDueDate: input.docDueDate,
        lines: input.lines,
        resolveLineTax: async ({ itemCode, sourceTaxCode }) => {
          const resolved = await partnerTax.resolve({
            docSide: "sales",
            itemCode,
            sourceCompanyId: partner.buyerCompany.companyId,
            sourceSapDbName: partner.buyerCompany.sapDbName,
            sourceTaxCode,
            targetCardCode,
            targetCompanyId,
            targetSapDbName,
          });
          if (resolved.source === "ovtg_rate") {
            taxItem += 1;
            resolvedPairs.add(`${sourceTaxCode}->${resolved.taxCode}(ovtg)`);
          } else if (resolved.source === "item") {
            taxItem += 1;
            resolvedPairs.add(`${itemCode}->${resolved.taxCode}(item)`);
          } else if (resolved.source === "bp") {
            taxBp += 1;
            resolvedPairs.add(`${targetCardCode}->${resolved.taxCode}(bp)`);
          } else {
            taxOmit += 1;
          }
          return resolved.taxCode;
        },
        numAtCard: input.numAtCard,
        poDocEntry: input.docEntry,
        poDocNum: input.docNum ?? null,
        remarksTag,
      });

      const { taxUsage, ...payload } = built;

      icLog.info(IC_LOG_SCOPE.TAX, "IC partner tax summary for AR draft (dynamic)", {
        check: "tax_resolve_summary",
        outcome: taxOmit > 0 ? "fail" : "pass",
        // Explicit PO (buyer) vs AR (seller) tax codes per line.
        resolvedPairs: [...resolvedPairs],
        targetCompanyId,
        taxBp,
        taxItem,
        taxOmit,
        taxUsage,
      });

      return payload;
    },
  };
};

export const buildArDraftService = createBuildArDraftService();
