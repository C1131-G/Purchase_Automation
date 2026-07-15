import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getList = vi.fn();
const getByDocNum = vi.fn();
const create = vi.fn();
const cancel = vi.fn();

vi.mock("@/modules/purchase-order/purchase-order.service", () => ({
  purchaseOrderService: {
    cancel: (...args: unknown[]) => cancel(...args),
    create: (...args: unknown[]) => create(...args),
    getByDocNum: (...args: unknown[]) => getByDocNum(...args),
    getById: (...args: unknown[]) => getByDocNum(...args),
    getDocNums: vi.fn(),
    getList: (...args: unknown[]) => getList(...args),
    previewNextDocNum: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/core/utils/sap-format.util", () => ({
  toPascalCase: (row: Record<string, unknown>) => row,
  toPascalCaseDocnums: (rows: unknown[]) => rows,
  toPascalCaseList: (result: { data: unknown[] }) => ({
    data: result.data,
    limit: 20,
    page: 1,
    total: result.data.length,
    totalPages: 1,
  }),
}));

import { AppError } from "@/core/errors/app-error";

import * as controller from "@/modules/purchase-order/purchase-order.controller";

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
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("purchaseOrder controller", () => {
  beforeEach(() => {
    getList.mockReset();
    getByDocNum.mockReset();
    create.mockReset();
    cancel.mockReset();
  });

  it("returns 200 list envelope on getList", async () => {
    getList.mockResolvedValue({ data: [{ id: 1 }], total: 1 });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getList({ query: {} } as Request, res, next);

    expect(res.statusCode).toBe(200);
    expect((res.body as { success: boolean }).success).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards not-found errors via next on getById", async () => {
    const err = new AppError("Purchase order not found", 404, "NOT_FOUND");
    getByDocNum.mockRejectedValue(err);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getById({ params: { id: "9" }, query: {} } as unknown as Request, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it("returns 201 on create", async () => {
    create.mockResolvedValue({ id: 10, docNum: 20010 });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.create({ body: { cardCode: "V001" } } as Request, res, next);

    expect(res.statusCode).toBe(201);
    expect((res.body as { success: boolean; message: string }).success).toBe(true);
    expect((res.body as { message: string }).message).toMatch(/created/i);
  });

  it("returns 200 on cancel", async () => {
    cancel.mockResolvedValue({ id: 10, canceled: "Y" });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.cancel({ params: { id: "10" } } as unknown as Request, res, next);

    expect(res.statusCode).toBe(200);
    expect((res.body as { success: boolean }).success).toBe(true);
  });
});
