import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getList = vi.fn();
const create = vi.fn();
const cancel = vi.fn();
const getByDocNum = vi.fn();

vi.mock("@/modules/ar-invoice/ar-invoice.service", () => ({
  arInvoiceService: {
    cancel: (...args: unknown[]) => cancel(...args),
    create: (...args: unknown[]) => create(...args),
    getByDocNum: (...args: unknown[]) => getByDocNum(...args),
    getById: (...args: unknown[]) => getByDocNum(...args),
    getDocNums: vi.fn(),
    getList: (...args: unknown[]) => getList(...args),
    previewNextDocNum: vi.fn(),
    update: vi.fn(),
    reopen: vi.fn(),
  },
}));

vi.mock("@/core/utils/sap-format.util", () => ({
  toPascalCase: (row: Record<string, unknown>) => row,
  toPascalCaseDocnums: (rows: unknown[]) => rows,
  toPascalCaseList: (result: { data?: unknown[] }) => ({
    data: result.data ?? [],
    limit: 20,
    page: 1,
    total: (result.data ?? []).length,
    totalPages: 1,
  }),
}));

import { AppError } from "@/core/errors/app-error";
import * as controller from "@/modules/ar-invoice/ar-invoice.controller";

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

describe("ar-invoice controller", () => {
  beforeEach(() => {
    getList.mockReset();
    create.mockReset();
    cancel.mockReset();
    getByDocNum.mockReset();
  });

  it("returns 200 list envelope", async () => {
    getList.mockResolvedValue({ data: [{ id: 1 }], total: 1 });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    await controller.getList({ query: {} } as Request, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("forwards errors via next on getById", async () => {
    const err = new AppError("not found", 404, "NOT_FOUND");
    getByDocNum.mockRejectedValue(err);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    if (typeof controller.getById === "function") {
      await controller.getById({ params: { id: "9" }, query: {} } as unknown as Request, res, next);
      expect(next).toHaveBeenCalledWith(err);
    }
  });

  it("returns 201 on create", async () => {
    create.mockResolvedValue({ id: 10 });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    await controller.create({ body: {} } as Request, res, next);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("returns 200 on cancel", async () => {
    cancel.mockResolvedValue({ id: 10, canceled: "Y" });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    await controller.cancel({ params: { id: "10" } } as unknown as Request, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
