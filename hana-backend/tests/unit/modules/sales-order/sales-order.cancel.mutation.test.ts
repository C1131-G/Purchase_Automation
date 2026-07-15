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

import { cancelSalesOrder } from "@/modules/sales-order/sales-order.cancel.mutation";

describe("cancelSalesOrder", () => {
  beforeEach(() => {
    request.mockReset();
    getSession.mockReset();
    purgeCache.mockReset();
  });

  it("posts cancel to Service Layer", async () => {
    request.mockResolvedValue({});
    getSession.mockReturnValue({ companyDB: "TEST_COMPANY" });

    const result = await cancelSalesOrder("sess-1", "99");

    expect(request).toHaveBeenCalledWith("sess-1", "POST", "/Orders(99)/Cancel");
    expect(result.success).toBe(true);
  });

  it("rethrows when Service Layer fails", async () => {
    request.mockRejectedValue(new Error("cancel failed"));

    await expect(cancelSalesOrder("sess-1", "99")).rejects.toThrow("cancel failed");
  });
});
