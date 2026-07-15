import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const updateHeader = vi.fn();
const getById = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: () => ({
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  }),
}));

vi.mock("@/modules/sales-order/sales-order.repository", () => ({
  salesOrderRepository: {
    findById: (...args: unknown[]) => findById(...args),
    findLineBaseEntries: vi.fn(async () => []),
    updateHeader: (...args: unknown[]) => updateHeader(...args),
  },
}));

vi.mock("@/modules/sales-order/sales-order.queries", () => ({
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

// sales-order may export cancel from mutations.update or mutations — resolve at runtime
import * as mutations from "@/modules/sales-order/sales-order.mutations";

describe("cancel sales order", () => {
  beforeEach(() => {
    findById.mockReset();
    updateHeader.mockReset();
    getById.mockReset();
  });

  it("exposes a cancel function", () => {
    expect(typeof mutations.cancel).toBe("function");
  });

  it("throws not found when the sales order does not exist", async () => {
    findById.mockResolvedValue(null);

    await expect(mutations.cancel(999)).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "NOT_FOUND",
    });
  });

  it("marks the document canceled when it exists", async () => {
    findById.mockResolvedValue({ id: 7, docNum: 90001, docStatus: "O" });
    updateHeader.mockResolvedValue(undefined);
    getById.mockResolvedValue({ id: 7, canceled: "Y", docNum: 90001 });

    const result = await mutations.cancel(7);

    expect(updateHeader).toHaveBeenCalledWith({}, 7, expect.objectContaining({ canceled: "Y" }));
    expect(result).toEqual({ id: 7, canceled: "Y", docNum: 90001 });
  });

  it("propagates AppError from not found path", async () => {
    findById.mockResolvedValue(null);

    await expect(mutations.cancel(1)).rejects.toBeInstanceOf(AppError);
  });
});
