import { describe, expect, it } from "vitest";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";

describe("business partner addresses query key", () => {
  it("namespaces lazy addresses under create-shared", () => {
    const key = createSharedKeys.businessPartnerAddresses("V-100");
    expect(key[0]).toBe("create-shared");
    expect(key[1]).toBe("business-partner-addresses");
    expect(key[2]).toBe("V-100");
  });

  it("uses intercompany vendor/customer list keys (slim payload)", () => {
    expect(createSharedKeys.vendors()).toEqual(["create-shared", "vendors-ic-v1"]);
    expect(createSharedKeys.customers()).toEqual(["create-shared", "customers-ic-v1"]);
  });
});
