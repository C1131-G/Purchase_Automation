import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const del = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: () => ({}),
}));

vi.mock("@/modules/incoming-payment/incoming-payment.repository", () => ({
  incomingPaymentRepository: {
    findById: (...args: unknown[]) => findById(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

import { AppError } from "@/core/errors/app-error";
import { cancel } from "@/modules/incoming-payment/incoming-payment.service";

describe("cancel incoming-payment", () => {
  beforeEach(() => {
    findById.mockReset();
    del.mockReset();
  });

  it("throws AppError when payment does not exist", async () => {
    findById.mockResolvedValue(null);
    await expect(cancel(999)).rejects.toBeInstanceOf(AppError);
  });

  it("deletes payment when it exists", async () => {
    findById.mockResolvedValue({ id: 3, docNum: 50 });
    del.mockResolvedValue(undefined);

    const result = await cancel(3);
    expect(del).toHaveBeenCalled();
    expect(result).toEqual({ id: 3 });
  });
});
