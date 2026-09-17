import { beforeEach, describe, expect, it, vi } from "vitest";

const getBySapDbName = vi.fn();
const listActiveForCompany = vi.fn();

vi.mock("@/modules/intercompany/config/company/company.service", () => ({
  createCompanyService: () => ({ getBySapDbName }),
}));
vi.mock("@/modules/intercompany/config/bp-mapping/bp-mapping.service", () => ({
  createBpMappingService: () => ({ listActiveForCompany }),
}));

import {
  buildIcCardCodePredicate,
  getIcPartnerScope,
} from "@/modules/intercompany/api/ic-partner-scope";

/**
 * ic-partner-scope.test.ts: IC partner scope — directional codes and predicates.
 * Covers: vendor/customer resolution, dedupe, fail-closed, SQL predicates.
 */
// Verifies directional partner scope resolution and predicates.
describe("IC partner scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies directional codes resolve with mapping dedupe.
  it("resolves directional purchase and sales codes and deduplicates mappings", async () => {
    getBySapDbName.mockResolvedValue({ companyId: 1, isActive: true });
    listActiveForCompany.mockResolvedValue([
      {
        buyerCompanyId: 1,
        vendorCompanyId: 2,
        vendorCode: " V-B ",
        buyerCustomerCode: "C-A",
        isActive: true,
      },
      {
        buyerCompanyId: 1,
        vendorCompanyId: 2,
        vendorCode: "V-B",
        buyerCustomerCode: "C-A",
        isActive: true,
      },
      {
        buyerCompanyId: 2,
        vendorCompanyId: 1,
        vendorCode: "V-A",
        buyerCustomerCode: " C-B ",
        isActive: true,
      },
      {
        buyerCompanyId: 1,
        vendorCompanyId: 3,
        vendorCode: "INACTIVE",
        buyerCustomerCode: "C-X",
        isActive: false,
      },
    ]);

    await expect(getIcPartnerScope("DB_A")).resolves.toEqual({
      companyId: 1,
      vendorCodes: ["V-B"],
      customerCodes: ["C-B"],
    });
  });

  // Verifies missing companies and errors fail closed.
  it("fails closed for missing companies and lookup errors", async () => {
    getBySapDbName.mockResolvedValueOnce(null);
    await expect(getIcPartnerScope("DB_MISSING")).resolves.toEqual({
      companyId: 0,
      vendorCodes: [],
      customerCodes: [],
    });

    getBySapDbName.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(getIcPartnerScope("DB_ERROR")).rejects.toMatchObject({
      statusCode: 503,
      errorCode: "IC_SCOPE_UNAVAILABLE",
    });
  });

  // Verifies parameterized and empty CardCode predicates.
  it("builds parameterized predicates and an empty predicate", () => {
    expect(buildIcCardCodePredicate('p."CardCode"', ["V-A", "V-B"])).toEqual({
      sql: 'p."CardCode" IN (?, ?)',
      params: ["V-A", "V-B"],
    });
    expect(buildIcCardCodePredicate('p."CardCode"', [])).toEqual({ sql: "1=0", params: [] });
  });
});
