import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
const getSession = vi.fn();
const purgeCache = vi.fn();

vi.mock("@/services/service-layer.service", () => ({
  serviceLayerClient: {
    request: (...args: unknown[]) => request(...args),
    getSession: (...args: unknown[]) => getSession(...args),
  },
}));

vi.mock("@/core/utils/cache", () => ({
  purgeCache: (...args: unknown[]) => purgeCache(...args),
}));

import { cancelPurchaseQuotation } from "@/modules/purchase-quotation/purchase-quotation.cancel.mutation";

describe("cancelPurchaseQuotation", () => {
  beforeEach(() => {
    request.mockReset();
    getSession.mockReset();
    purgeCache.mockReset();
  });

  it("posts cancel to Service Layer", async () => {
    request.mockResolvedValue({});
    getSession.mockReturnValue({ companyDB: "TEST_COMPANY" });

    const result = await cancelPurchaseQuotation("sess-1", "42");

    expect(request).toHaveBeenCalledWith("sess-1", "POST", "/PurchaseQuotations(42)/Cancel");
    expect(purgeCache).toHaveBeenCalledWith(expect.stringContaining("dashboard:overview:"));
    expect(result.success).toBe(true);
  });

  it("rethrows when Service Layer fails", async () => {
    request.mockRejectedValue(new Error("SAP down"));
    await expect(cancelPurchaseQuotation("sess-1", "42")).rejects.toThrow("SAP down");
  });
});
