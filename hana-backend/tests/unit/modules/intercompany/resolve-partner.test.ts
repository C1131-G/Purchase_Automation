import { describe, expect, it } from "vitest";

import { createBpMappingQueries } from "@/modules/intercompany/config/bp-mapping/bp-mapping.queries";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

describe("resolve-partner (T3.1 / T3.2)", () => {
  const build = () => {
    const db = createMemoryDb();
    seedMemoryCompanyGraph(db);
    const sql = createMemorySqlClient(db);
    const company = createCompanyService(createCompanyQueries(sql));
    const bpMapping = createBpMappingService(createBpMappingQueries(sql));
    return createResolvePartnerService({ bpMapping, company });
  };

  it("T3.1 known vendor → partner company + buyer customer", async () => {
    const service = build();
    const result = await service.resolve({ cardCode: "V-B", dbName: "DB_A" });
    expect(result).not.toBeNull();
    expect(result?.sellerCompany.companyCode).toBe("B");
    expect(result?.buyerCustomerCode).toBe("C-A-ON-B");
    expect(result?.vendorCode).toBe("V-B");

    const outcome = await service.resolveOutcome({ cardCode: "V-B", dbName: "DB_A" });
    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.partner.sellerCompany.companyCode).toBe("B");
    }
  });

  it("T3.2 unknown vendor → null, no throw", async () => {
    const service = build();
    await expect(service.resolve({ cardCode: "UNKNOWN", dbName: "DB_A" })).resolves.toBeNull();
    await expect(service.resolve({ cardCode: "V-B", dbName: "NOPE" })).resolves.toBeNull();
  });

  it("resolveOutcome names bp_mapping miss vs buyer company miss", async () => {
    const service = build();

    const unknownVendor = await service.resolveOutcome({ cardCode: "UNKNOWN", dbName: "DB_A" });
    expect(unknownVendor.success).toBe(false);
    if (!unknownVendor.success) {
      expect(unknownVendor.reason).toBe("bp_mapping_not_found");
      expect(unknownVendor.check).toBe("bp_mapping");
    }

    const unknownDb = await service.resolveOutcome({ cardCode: "V-B", dbName: "NOPE" });
    expect(unknownDb.success).toBe(false);
    if (!unknownDb.success) {
      expect(unknownDb.reason).toBe("buyer_company_not_found");
      expect(unknownDb.check).toBe("buyer_company");
    }
  });
});
