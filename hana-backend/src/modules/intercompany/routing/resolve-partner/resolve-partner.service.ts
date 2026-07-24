import type { BpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";

import type {
  ResolvePartnerFailure,
  ResolvePartnerInput,
  ResolvePartnerOutcome,
  ResolvePartnerResult,
} from "./resolve-partner.types";

const SCOPE = IC_LOG_SCOPE.ROUTING;

const fail = (
  failure: Omit<ResolvePartnerFailure, "success">,
  logFields?: Record<string, unknown>,
): ResolvePartnerFailure => {
  icLog.info(SCOPE, "IC resolve partner check failed", {
    check: failure.check,
    outcome: "skip",
    reason: failure.reason,
    detail: failure.detail,
    dbName: failure.dbName,
    cardCode: failure.cardCode,
    buyerCompanyId: failure.buyerCompanyId,
    vendorCompanyId: failure.vendorCompanyId,
    ...logFields,
  });
  return { success: false, ...failure };
};

export type ResolvePartnerService = {
  /**
   * Detailed outcome (preferred). Use for capture gates that need `check`/`detail` in logs.
   */
  resolveOutcome: (input: ResolvePartnerInput) => Promise<ResolvePartnerOutcome>;
  /**
   * Partner on success, null on any routing miss (backward compatible).
   */
  resolve: (input: ResolvePartnerInput) => Promise<ResolvePartnerResult | null>;
};

export const createResolvePartnerService = (deps?: {
  company?: CompanyService;
  bpMapping?: BpMappingService;
}): ResolvePartnerService => {
  const company = deps?.company ?? createCompanyService();
  const bpMapping = deps?.bpMapping ?? createBpMappingService();

  const resolveOutcome = async (input: ResolvePartnerInput): Promise<ResolvePartnerOutcome> => {
    const vendorCode = input.cardCode?.trim() ?? "";
    const dbName = input.dbName?.trim() ?? "";

    if (!vendorCode || !dbName) {
      return fail({
        cardCode: vendorCode || undefined,
        check: "input",
        dbName: dbName || undefined,
        detail: "cardCode and dbName are required",
        reason: "missing_card_or_db",
      });
    }

    const buyerCompany = await company.getBySapDbName(dbName);
    if (!buyerCompany) {
      return fail({
        cardCode: vendorCode,
        check: "buyer_company",
        dbName,
        detail: `No IC_COMPANY row for SAP_DB_NAME=${dbName}`,
        reason: "buyer_company_not_found",
      });
    }

    if (!buyerCompany.isActive) {
      return fail({
        buyerCompanyId: buyerCompany.companyId,
        cardCode: vendorCode,
        check: "buyer_company",
        dbName,
        detail: `IC_COMPANY companyId=${buyerCompany.companyId} is inactive`,
        reason: "buyer_company_inactive",
      });
    }

    icLog.debug(SCOPE, "IC resolve partner buyer ok", {
      buyerCompanyId: buyerCompany.companyId,
      check: "buyer_company",
      dbName,
      outcome: "pass",
    });

    const mapping = await bpMapping.findByBuyerAndVendorCode(buyerCompany.companyId, vendorCode);
    if (!mapping) {
      return fail({
        buyerCompanyId: buyerCompany.companyId,
        cardCode: vendorCode,
        check: "bp_mapping",
        dbName,
        detail: `No active IC_BP_MAPPING for BUYER_COMPANY_ID=${buyerCompany.companyId} VENDOR_CODE=${vendorCode}`,
        reason: "bp_mapping_not_found",
      });
    }

    icLog.debug(SCOPE, "IC resolve partner BP map ok", {
      buyerCompanyId: buyerCompany.companyId,
      bpMappingId: mapping.mappingId,
      check: "bp_mapping",
      outcome: "pass",
      vendorCode,
    });

    const sellerCompany = await company.getById(mapping.vendorCompanyId);
    if (!sellerCompany) {
      return fail({
        buyerCompanyId: buyerCompany.companyId,
        cardCode: vendorCode,
        check: "seller_company",
        dbName,
        detail: `No IC_COMPANY for VENDOR_COMPANY_ID=${mapping.vendorCompanyId}`,
        reason: "seller_company_not_found",
        vendorCompanyId: mapping.vendorCompanyId,
      });
    }

    if (!sellerCompany.isActive) {
      return fail({
        buyerCompanyId: buyerCompany.companyId,
        cardCode: vendorCode,
        check: "seller_company",
        dbName,
        detail: `Seller IC_COMPANY companyId=${sellerCompany.companyId} is inactive`,
        reason: "seller_company_inactive",
        vendorCompanyId: sellerCompany.companyId,
      });
    }

    const partner: ResolvePartnerResult = {
      bpMappingId: mapping.mappingId,
      buyerCompany,
      buyerCustomerCode: mapping.buyerCustomerCode,
      sellerCompany,
      vendorCode,
    };

    icLog.info(SCOPE, "IC resolve partner ok", {
      buyerCompanyId: partner.buyerCompany.companyId,
      buyerCustomerCode: partner.buyerCustomerCode,
      check: "resolve_partner",
      dbName,
      outcome: "pass",
      sellerCompanyId: partner.sellerCompany.companyId,
      vendorCode,
    });

    return { success: true, partner };
  };

  return {
    resolve: async (input) => {
      const outcome = await resolveOutcome(input);
      return outcome.success ? outcome.partner : null;
    },
    resolveOutcome,
  };
};

export const resolvePartnerService = createResolvePartnerService();
