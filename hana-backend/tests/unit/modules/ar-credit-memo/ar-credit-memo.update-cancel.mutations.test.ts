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

import { cancelCreditNote } from "@/modules/ar-credit-memo/ar-credit-memo.update-cancel.mutations";

describe("cancelCreditNote", () => {
  beforeEach(() => {
    request.mockReset();
    getSession.mockReset();
    purgeCache.mockReset();
  });

  it("posts cancel to Service Layer", async () => {
    request.mockResolvedValue({});
    getSession.mockReturnValue({ companyDB: "TEST_COMPANY" });

    const result = await cancelCreditNote("sess-1", "42");

    expect(request).toHaveBeenCalledWith("sess-1", "POST", "/CreditNotes(42)/Cancel");
    // no cache purge required
    expect(result.success).toBe(true);
  });

  it("rethrows when Service Layer fails", async () => {
    request.mockRejectedValue(new Error("SAP down"));
    await expect(cancelCreditNote("sess-1", "42")).rejects.toThrow("SAP down");
  });
});
