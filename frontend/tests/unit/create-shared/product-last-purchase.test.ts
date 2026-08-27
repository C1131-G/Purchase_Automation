import { describe, expect, it } from "vitest";

import { mapProductLookup } from "@/features/create-pages/create-shared/api/create-shared.mapper";
import {
  calculateLineTotals,
  calculateOrderTotals,
} from "@/features/create-pages/create-shared/utils/create-order.calculations";
import {
  repricePqRows,
  resolvePqProductPricing,
} from "@/features/create-pages/purchase-quotation-create/hooks/use-pq-products";

describe("product last purchase mapping", () => {
  it("prefers a positive SAP last purchase price and currency for a PQ row", () => {
    expect(
      resolvePqProductPricing({
        currency: "INR",
        lastPurchaseCurrency: "USD",
        lastPurchasePrice: 37.5,
        price: 42,
      }),
    ).toEqual({
      currency: "USD",
      discountAmount: 0,
      discountPercent: 0,
      price: 37.5,
    });
  });

  it("falls back to the existing product price when SAP has no last purchase price", () => {
    expect(
      resolvePqProductPricing({
        currency: "INR",
        lastPurchaseCurrency: "USD",
        lastPurchasePrice: 0,
        price: 42,
      }),
    ).toEqual({
      currency: "INR",
      discountAmount: 0,
      discountPercent: 0,
      price: 42,
    });
  });

  it("keeps every row and reprices only products with a positive last purchase price", () => {
    const result = repricePqRows(
      [
        {
          comment: "",
          currency: "INR",
          discountAmount: 9,
          discountPercent: 10,
          id: "row-1",
          price: 10,
          productCode: "SKU-1",
          productName: "Item 1",
          quantity: 0,
          requiredQuantity: 2,
          stock: 0,
          taxRate: 0,
          uomCode: "EA",
          warehouseCode: "01",
        },
        {
          comment: "",
          currency: "INR",
          discountAmount: 4,
          discountPercent: 5,
          id: "row-2",
          price: 8,
          productCode: "SKU-2",
          productName: "Item 2",
          quantity: 0,
          requiredQuantity: 1,
          stock: 0,
          taxRate: 0,
          uomCode: "EA",
          warehouseCode: "01",
        },
      ],
      [
        {
          code: "SKU-1",
          currency: "INR",
          defaultWarehouse: "01",
          lastPurchaseCurrency: "USD",
          lastPurchasePrice: 12,
          name: "Item 1",
          price: 10,
          stock: 0,
          taxRate: 0,
          vatGroup: "",
        },
      ],
    );

    expect(result.repricedCount).toBe(1);
    expect(result.removedCount).toBe(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      currency: "USD",
      discountAmount: 9,
      discountPercent: 10,
      price: 12,
      productCode: "SKU-1",
      requiredQuantity: 2,
    });
    expect(result.rows[1]).toMatchObject({
      currency: "INR",
      discountAmount: 4,
      discountPercent: 5,
      price: 8,
      productCode: "SKU-2",
    });
  });

  it("keeps SAP last purchase values separate from the existing fallback price", () => {
    const product = mapProductLookup({
      Currency: "INR",
      ItemCode: "SKU-1",
      ItemName: "Item",
      LastPurchaseCurrency: "USD",
      LastPurchasePrice: 37.5,
      Price: 42,
    });

    expect(product.price).toBe(42);
    expect(product.currency).toBe("INR");
    expect(product.lastPurchasePrice).toBe(37.5);
    expect(product.lastPurchaseCurrency).toBe("USD");
  });

  it("can calculate PQ estimates from required quantity without changing quoted quantity", () => {
    const row = {
      comment: "",
      currency: "USD",
      discountAmount: 0,
      discountPercent: 0,
      id: "row-1",
      price: 12.5,
      productCode: "SKU-1",
      productName: "Item",
      quantity: 0,
      requiredQuantity: 4,
      stock: 0,
      taxRate: 0,
      uomCode: "EA",
      warehouseCode: "01",
    };
    const totals = calculateLineTotals(row, { quantityOverride: 4 });
    const orderTotals = calculateOrderTotals([row], {
      quantitySelector: (line) => line.requiredQuantity ?? line.quantity,
    });

    expect(totals.gross).toBe(50);
    expect(totals.lineNet).toBe(50);
    expect(totals.lineTotal).toBe(50);
    expect(orderTotals.netTotal).toBe(50);
  });
});
