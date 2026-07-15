import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceGetList = vi.fn();
const serviceGetOne = vi.fn();
const serviceCreate = vi.fn();
const serviceCancel = vi.fn();

vi.mock("@/modules/purchase-order/purchase-order.service", () => ({
  purchaseOrderService: {
    cancelPurchaseOrder: (...args: unknown[]) => serviceCancel(...args),
    createPurchaseOrder: (...args: unknown[]) => serviceCreate(...args),
    getPurchaseOrder: (...args: unknown[]) => serviceGetOne(...args),
    getPurchaseOrderByDocNum: vi.fn(),
    getPurchaseOrderDocNums: vi.fn(),
    getPurchaseOrders: (...args: unknown[]) => serviceGetList(...args),
    updatePurchaseOrder: vi.fn(),
  },
}));

vi.mock("@/modules/purchase-order/purchase-order.schema", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/purchase-order/purchase-order.schema")>();
  return {
    ...actual,
    CreatePurchaseOrderInputSchema: {
      parse: (v: unknown) => v,
    },
    UpdatePurchaseOrderInputSchema: {
      parse: (v: unknown) => v,
    },
  };
});

import AppError from "@/core/errors/app-error";

import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
} from "@/modules/purchase-order/purchase-order.controller";

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

describe("purchaseOrder controller (HANA)", () => {
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

    await getPurchaseOrders(authReq(), res, next);

    expect(res.statusCode).toBe(200);
    expect((res.body as { success: boolean }).success).toBe(true);
  });

  it("returns 404 when getPurchaseOrder yields null", async () => {
    serviceGetOne.mockResolvedValue(null);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getPurchaseOrder(authReq({ params: { id: "1" } }), res, next);

    expect(res.statusCode).toBe(404);
  });

  it("forwards errors from getPurchaseOrder via next", async () => {
    const err = new AppError("boom", 500, "INTERNAL");
    serviceGetOne.mockRejectedValue(err);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getPurchaseOrder(authReq({ params: { id: "1" } }), res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it("returns success on create", async () => {
    serviceCreate.mockResolvedValue({ DocEntry: 1, success: true });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await createPurchaseOrder(authReq({ body: { CardCode: "V1" } }), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.body).toBeDefined();
  });

  it("returns success on cancel", async () => {
    serviceCancel.mockResolvedValue({ success: true, message: "ok" });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await cancelPurchaseOrder(authReq({ params: { id: "1" } }), res, next);

    expect((res.body as { success: boolean }).success).toBe(true);
  });
});
