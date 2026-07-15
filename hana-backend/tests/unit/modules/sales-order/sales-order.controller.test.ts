import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceGetList = vi.fn();
const serviceGetOne = vi.fn();
const serviceCreate = vi.fn();
const serviceCancel = vi.fn();

vi.mock("@/modules/sales-order/sales-order.service", () => ({
  salesOrderService: {
    cancelSalesOrder: (...args: unknown[]) => serviceCancel(...args),
    createSalesOrder: (...args: unknown[]) => serviceCreate(...args),
    getSalesOrder: (...args: unknown[]) => serviceGetOne(...args),
    getSalesOrderByDocNum: vi.fn(),
    getSalesOrderDocNums: vi.fn(),
    getSalesOrders: (...args: unknown[]) => serviceGetList(...args),
    updateSalesOrder: vi.fn(),
  },
}));

vi.mock("@/modules/sales-order/sales-order.schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/sales-order/sales-order.schema")>();
  return {
    ...actual,
    CreateSalesOrderInputSchema: {
      parse: (v: unknown) => v,
    },
    UpdateSalesOrderInputSchema: {
      parse: (v: unknown) => v,
    },
  };
});

import AppError from "@/core/errors/app-error";

import {
  cancelSalesOrder,
  createSalesOrder,
  getSalesOrder,
  getSalesOrders,
} from "@/modules/sales-order/sales-order.controller";

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

function authReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { dbName: "TEST_COMPANY", userName: "u" },
    session: { sessionId: "sess" },
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

describe("salesOrder controller (HANA)", () => {
  beforeEach(() => {
    serviceGetList.mockReset();
    serviceGetOne.mockReset();
    serviceCreate.mockReset();
    serviceCancel.mockReset();
  });

  it("returns 200 list envelope", async () => {
    serviceGetList.mockResolvedValue({ data: [], page: 1, limit: 10, total: 0 });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getSalesOrders(authReq(), res, next);

    expect(res.statusCode).toBe(200);
    expect((res.body as { success: boolean }).success).toBe(true);
  });

  it("forwards errors via next", async () => {
    const err = new AppError("boom", 500, "INTERNAL");
    serviceGetOne.mockRejectedValue(err);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getSalesOrder(authReq({ params: { id: "1" } }), res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it("returns 201 on create", async () => {
    serviceCreate.mockResolvedValue({ DocEntry: 1, message: "ok" });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await createSalesOrder(authReq({ body: { CardCode: "C1" } }), res, next);

    expect(res.statusCode).toBe(201);
    expect((res.body as { success: boolean }).success).toBe(true);
  });

  it("returns 200 on cancel", async () => {
    serviceCancel.mockResolvedValue({ success: true, message: "ok" });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await cancelSalesOrder(authReq({ params: { id: "1" } }), res, next);

    expect(res.statusCode).toBe(200);
    expect((res.body as { success: boolean }).success).toBe(true);
  });
});
