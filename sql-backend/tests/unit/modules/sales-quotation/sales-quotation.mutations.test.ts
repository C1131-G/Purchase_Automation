import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const updateHeader = vi.fn();
const getById = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: () => ({}),
}));

vi.mock("@/modules/sales-quotation/sales-quotation.repository", () => ({
  salesQuotationRepository: {
    findById: (...args: unknown[]) => findById(...args),
    updateHeader: (...args: unknown[]) => updateHeader(...args),
  },
}));

vi.mock("@/modules/sales-quotation/sales-quotation.queries", () => ({
  getById: (...args: unknown[]) => getById(...args),
}));

vi.mock("@/modules/master-data/master-data.service", () => ({
  resolveCardName: vi.fn(async (code: string, name?: string) => name ?? code),
}));

vi.mock("@/services/document-link/document-link", () => ({
  recalculateParentStatuses: vi.fn(),
  validateBaseLinks: vi.fn(),
}));

vi.mock("@/core/utils/series.util", () => ({
  getNextDocNum: vi.fn(async () => 1001),
  previewNextDocNum: vi.fn(async () => 1001),
}));

import { AppError } from "@/core/errors/app-error";
import { cancel } from "@/modules/sales-quotation/sales-quotation.mutations";

describe("cancel sales-quotation", () => {
  beforeEach(() => {
    findById.mockReset();
    updateHeader.mockReset();
    getById.mockReset();
  });

  it("throws not found when document does not exist", async () => {
    findById.mockResolvedValue(null);
    await expect(cancel(999)).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "NOT_FOUND",
    });
  });

  it("marks document canceled when it exists", async () => {
    findById.mockResolvedValue({ id: 5, docNum: 100, docStatus: "O" });
    updateHeader.mockResolvedValue(undefined);
    getById.mockResolvedValue({ id: 5, canceled: "Y", docNum: 100 });

    const result = await cancel(5);
    expect(updateHeader).toHaveBeenCalled();
    expect(result).toEqual({ id: 5, canceled: "Y", docNum: 100 });
  });

  it("propagates AppError", async () => {
    findById.mockResolvedValue(null);
    await expect(cancel(1)).rejects.toBeInstanceOf(AppError);
  });
});
