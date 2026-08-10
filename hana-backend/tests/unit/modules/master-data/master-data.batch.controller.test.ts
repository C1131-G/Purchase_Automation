import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProductsByCodes = vi.fn();
const getProductWarehouseStocksBatch = vi.fn();
const getBusinessPartnerAddresses = vi.fn();

vi.mock("@/modules/master-data/master-data.service", () => ({
  masterDataService: {
    getProductsByCodes: (...args: unknown[]) => getProductsByCodes(...args),
    getProductWarehouseStocksBatch: (...args: unknown[]) => getProductWarehouseStocksBatch(...args),
    getBusinessPartnerAddresses: (...args: unknown[]) => getBusinessPartnerAddresses(...args),
  },
}));

import {
  getBusinessPartnerAddresses as getBusinessPartnerAddressesController,
  getProductsByCodes as getProductsByCodesController,
  getProductWarehouseStocksBatch as getProductWarehouseStocksBatchController,
} from "@/modules/master-data/master-data.controller";

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

describe("master-data batch controllers", () => {
  beforeEach(() => {
    getProductsByCodes.mockReset();
    getProductWarehouseStocksBatch.mockReset();
    getBusinessPartnerAddresses.mockReset();
  });

  it("products-by-codes returns known codes envelope", async () => {
    getProductsByCodes.mockResolvedValue([
      { ItemCode: "SKU-1", productCode: "SKU-1" },
      { ItemCode: "SKU-2", productCode: "SKU-2" },
    ]);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getProductsByCodesController(
      authReq({ query: { codes: "SKU-1,SKU-2", type: "purchase" } }),
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(getProductsByCodes).toHaveBeenCalledWith(
      "TEST_COMPANY",
      ["SKU-1", "SKU-2"],
      "purchase",
      undefined,
      undefined,
      undefined,
    );
    const body = res.body as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("products-by-codes handles empty codes without calling service with garbage", async () => {
    getProductsByCodes.mockResolvedValue([]);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getProductsByCodesController(authReq({ query: { codes: "  , , " } }), res, next);

    expect(getProductsByCodes).toHaveBeenCalledWith(
      "TEST_COMPANY",
      [],
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect((res.body as { data: unknown[] }).data).toEqual([]);
  });

  it("stocks-batch returns flat rows for N items in one call", async () => {
    getProductWarehouseStocksBatch.mockResolvedValue([
      { itemCode: "A", code: "WH01", name: "Main", stock: 10 },
      { itemCode: "B", code: "WH01", name: "Main", stock: 5 },
    ]);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getProductWarehouseStocksBatchController(
      authReq({ query: { itemCodes: "A,B", warehouseCode: "WH01" } }),
      res,
      next,
    );

    expect(getProductWarehouseStocksBatch).toHaveBeenCalledWith("TEST_COMPANY", ["A", "B"], "WH01");
    expect(getProductWarehouseStocksBatch).toHaveBeenCalledTimes(1);
    const body = res.body as { success: boolean; data: Array<{ itemCode: string; stock: number }> };
    expect(body.success).toBe(true);
    expect(body.data.find((row) => row.itemCode === "A")?.stock).toBe(10);
    expect(body.data.find((row) => row.itemCode === "B")?.stock).toBe(5);
  });

  it("forwards service errors via next", async () => {
    const boom = new Error("hana down");
    getProductsByCodes.mockRejectedValue(boom);
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getProductsByCodesController(authReq({ query: { codes: "X" } }), res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it("business-partner addresses returns lazy bundle for card code", async () => {
    getBusinessPartnerAddresses.mockResolvedValue({
      cardCode: "V001",
      billToAddress: "Bill St",
      shipToAddress: "Ship St",
      addresses: [
        { addressName: "Bill", addressType: "B", addressText: "Bill St" },
        { addressName: "Ship", addressType: "S", addressText: "Ship St" },
      ],
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await getBusinessPartnerAddressesController(
      authReq({ params: { cardCode: "V001" } }),
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(getBusinessPartnerAddresses).toHaveBeenCalledWith("TEST_COMPANY", "V001");
    const body = res.body as {
      success: boolean;
      data: { cardCode: string; addresses: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(body.data.cardCode).toBe("V001");
    expect(body.data.addresses).toHaveLength(2);
  });
});
