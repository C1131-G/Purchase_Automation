import { getCachedData } from "@/core/utils/cache";
import AppError from "@/core/errors/app-error";

import { createBpMappingService } from "../config/bp-mapping/bp-mapping.service";
import { createCompanyService } from "../config/company/company.service";
import { partnerWarehouseMasters } from "../config/warehouse/partner-warehouse.masters";

export type IcPartnerRole = "purchase" | "sales";

export type IcPartnerScope = {
  companyId: number;
  vendorCodes: string[];
  customerCodes: string[];
};

export type IcPartnerLookupContext = {
  code: string;
  companyCode: string | null;
  companyName: string | null;
  defaultWarehouseCode: string | null;
  defaultBranchId: number | null;
};

export const getIcPartnerLookupContext = async (
  dbName: string,
  role: IcPartnerRole,
): Promise<IcPartnerLookupContext[]> => {
  const normalizedDbName = dbName.trim();
  if (!normalizedDbName) return [];
  const company = await createCompanyService().getBySapDbName(normalizedDbName);
  if (!company || !company.isActive) return [];
  const mappings = await createBpMappingService().listActiveForCompany(company.companyId);
  const masters = partnerWarehouseMasters;
  const preferredBranch =
    company.defaultBranchId ?? (await masters.getDefaultObplBranch(normalizedDbName));
  const preferredWarehouse =
    preferredBranch == null
      ? await masters.getFirstActiveWarehouse(normalizedDbName)
      : await masters
          .getWarehouseForBranch(normalizedDbName, preferredBranch)
          .then((warehouseCode) =>
            warehouseCode ? { warehouseCode, branchId: preferredBranch } : null,
          );
  const fallbackWarehouse =
    preferredWarehouse ??
    (await masters.getFirstActiveBranchWarehouse(normalizedDbName)) ??
    (await masters.getFirstActiveWarehouse(normalizedDbName));
  const byCode = new Map<string, IcPartnerLookupContext>();
  for (const mapping of mappings) {
    const isPurchase = mapping.buyerCompanyId === company.companyId;
    const isSales = mapping.vendorCompanyId === company.companyId;
    if ((role === "purchase" && !isPurchase) || (role === "sales" && !isSales)) continue;
    const code = (role === "purchase" ? mapping.vendorCode : mapping.buyerCustomerCode).trim();
    if (!code || byCode.has(code)) continue;
    byCode.set(code, {
      code,
      companyCode:
        (role === "purchase" ? mapping.vendorCompanyCode : mapping.buyerCompanyCode) ?? null,
      companyName: role === "purchase" ? mapping.vendorCompanyName : mapping.buyerCompanyName,
      defaultWarehouseCode: fallbackWarehouse?.warehouseCode ?? null,
      defaultBranchId: fallbackWarehouse?.branchId ?? preferredBranch ?? null,
    });
  }
  return [...byCode.values()];
};

const normalizeCodes = (codes: string[]): string[] =>
  [...new Set(codes.map((code) => code.trim()).filter(Boolean))].sort();

/**
 * Resolve the only partner CardCodes visible to a tenant. Missing IC setup is
 * intentionally represented by empty sets; callers must never fall back to all BPs.
 */
export const getIcPartnerScope = async (dbName: string): Promise<IcPartnerScope> => {
  const normalizedDbName = dbName.trim();
  if (!normalizedDbName) {
    return { companyId: 0, vendorCodes: [], customerCodes: [] };
  }

  return getCachedData(
    `ic:partner-scope:${normalizedDbName}`,
    async () => {
      try {
        const company = await createCompanyService().getBySapDbName(normalizedDbName);
        if (!company || !company.isActive) {
          return { companyId: 0, vendorCodes: [], customerCodes: [] };
        }

        const mappings = await createBpMappingService().listActiveForCompany(company.companyId);
        return {
          companyId: company.companyId,
          vendorCodes: normalizeCodes(
            mappings
              .filter((mapping) => mapping.buyerCompanyId === company.companyId && mapping.isActive)
              .map((mapping) => mapping.vendorCode),
          ),
          customerCodes: normalizeCodes(
            mappings
              .filter(
                (mapping) => mapping.vendorCompanyId === company.companyId && mapping.isActive,
              )
              .map((mapping) => mapping.buyerCustomerCode),
          ),
        };
      } catch (error: unknown) {
        const cause = error instanceof Error ? error.message : String(error);
        throw new AppError(
          `Unable to resolve IC partner scope: ${cause}`,
          503,
          "IC_SCOPE_UNAVAILABLE",
        );
      }
    },
    60_000,
  );
};

export const getIcPartnerCodes = async (dbName: string, role: IcPartnerRole): Promise<string[]> => {
  const scope = await getIcPartnerScope(dbName);
  return role === "purchase" ? scope.vendorCodes : scope.customerCodes;
};

export const assertIcPartnerAllowed = async (
  dbName: string,
  role: IcPartnerRole,
  cardCode: string,
): Promise<void> => {
  const normalizedCardCode = cardCode.trim();
  const allowedCodes = await getIcPartnerCodes(dbName, role);
  if (!allowedCodes.includes(normalizedCardCode)) {
    throw new AppError("Document not found", 404, "NOT_FOUND");
  }
};

export const assertIcPartnerForCreate = async (
  dbName: string,
  role: IcPartnerRole,
  cardCode: string,
): Promise<void> => {
  const normalizedCardCode = cardCode.trim();
  const allowedCodes = await getIcPartnerCodes(dbName, role);
  if (!allowedCodes.includes(normalizedCardCode)) {
    throw new AppError(
      "Partner is not enabled for intercompany processing",
      403,
      "IC_PARTNER_FORBIDDEN",
    );
  }
};

export const buildIcCardCodePredicate = (
  column: string,
  cardCodes: string[],
): { sql: string; params: string[] } => {
  if (cardCodes.length === 0) return { sql: "1=0", params: [] };
  return {
    sql: `${column} IN (${cardCodes.map(() => "?").join(", ")})`,
    params: cardCodes,
  };
};
