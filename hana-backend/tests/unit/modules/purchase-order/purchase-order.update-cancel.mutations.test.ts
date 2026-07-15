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

import { cancelPurchaseOrder } from "@/modules/purchase-order/purchase-order.update-cancel.mutations";

describe("cancelPurchaseOrder", () => {
  beforeEach(() => {
    request.mockReset();
    getSession.mockReset();
    purgeCache.mockReset();
  });

  it("posts cancel to Service Layer and returns success", async () => {
    request.mockResolvedValue({});
    getSession.mockReturnValue({ companyDB: "TEST_COMPANY" });

    const result = await cancelPurchaseOrder("sess-1", "42");

    expect(request).toHaveBeenCalledWith("sess-1", "POST", "/PurchaseOrders(42)/Cancel");
    expect(purgeCache).toHaveBeenCalledWith("dash:purchase:TEST_COMPANY:");
    expect(result).toEqual({
      message: "Purchase Order cancelled successfully",
      success: true,
    });
  });

  it("rethrows when Service Layer fails", async () => {
    request.mockRejectedValue(new Error("SAP down"));

    await expect(cancelPurchaseOrder("sess-1", "42")).rejects.toThrow("SAP down");
  });
});
