import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const updateHeader = vi.fn();
const getById = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: () => ({
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  }),
}));

vi.mock("@/modules/purchase-order/purchase-order.repository", () => ({
  purchaseOrderRepository: {
    findById: (...args: unknown[]) => findById(...args),
    findLineBaseEntries: vi.fn(async () => []),
    updateHeader: (...args: unknown[]) => updateHeader(...args),
  },
}));

vi.mock("@/modules/purchase-order/purchase-order.queries", () => ({
  getById: (...args: unknown[]) => getById(...args),
}));

vi.mock("@/modules/master-data/master-data.service", () => ({
  resolveCardName: vi.fn(async (code: string, name?: string) => name ?? code),
}));

vi.mock("@/services/document-link/document-link", () => ({
  recalculateParentStatuses: vi.fn(),
  validateBaseLinks: vi.fn(),
}));

import { AppError } from "@/core/errors/app-error";

import { cancel } from "@/modules/purchase-order/purchase-order.mutations.update";

describe("cancel purchase order", () => {
  beforeEach(() => {
    findById.mockReset();
    updateHeader.mockReset();
    getById.mockReset();
  });

  it("throws not found when the purchase order does not exist", async () => {
    findById.mockResolvedValue(null);

    await expect(cancel(999)).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "NOT_FOUND",
    });
    expect(updateHeader).not.toHaveBeenCalled();
  });

  it("marks the document canceled when it exists", async () => {
    findById.mockResolvedValue({ id: 5, docNum: 20001, docStatus: "O" });
    updateHeader.mockResolvedValue(undefined);
    getById.mockResolvedValue({ id: 5, canceled: "Y", docNum: 20001 });

    const result = await cancel(5);

    expect(updateHeader).toHaveBeenCalledWith({}, 5, expect.objectContaining({ canceled: "Y" }));
    expect(result).toEqual({ id: 5, canceled: "Y", docNum: 20001 });
  });

  it("propagates AppError from not found path", async () => {
    findById.mockResolvedValue(null);

    await expect(cancel(1)).rejects.toBeInstanceOf(AppError);
  });
});
