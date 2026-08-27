import { describe, expect, it } from "vitest";

import { mapProductResults } from "@/modules/master-data/master-data.products-map";

const uoms = [
  { UomCode: "PCS", UomName: "Pieces", UomEntry: 1 },
  { UomCode: "BOX", UomName: "Box", UomEntry: 2 },
  { UomCode: "CTN", UomName: "Carton", UomEntry: 3 },
];

const baseArgs = {
  defaultCurrency: "INR",
  itemPrices: [],
  itemStocks: [],
  normalizedWarehouseCode: "01",
  priceList: undefined,
  taxGroups: [],
  uoms,
};

describe("mapProductResults item-master UoM", () => {
  it("converts foreign last purchase prices to the local currency for PQ", () => {
    const [row] = mapProductResults({
      ...baseArgs,
      defaultCurrency: "FJD",
      items: [
        {
          AvgPrice: 42,
          ItemCode: "SKU-1",
          ItemName: "Item",
          LastPurCur: "USD",
          LastPurPrc: 100,
        },
      ],
      lastPurchaseRates: new Map([["USD", 2.25]]),
      normalizeLastPurchaseCurrency: true,
      type: "purchase",
    });

    expect(row?.LastPurchasePrice).toBe(225);
    expect(row?.LastPurchaseCurrency).toBe("FJD");
    expect(row?.Price).toBe(42);
  });

  it("clears an unconvertible foreign last purchase price for PQ fallback", () => {
    const [row] = mapProductResults({
      ...baseArgs,
      defaultCurrency: "FJD",
      items: [
        {
          AvgPrice: 42,
          ItemCode: "SKU-1",
          ItemName: "Item",
          LastPurCur: "USD",
          LastPurPrc: 100,
        },
      ],
      normalizeLastPurchaseCurrency: true,
      type: "purchase",
    });

    expect(row?.LastPurchasePrice).toBe(0);
    expect(row?.LastPurchaseCurrency).toBe("FJD");
    expect(row?.Price).toBe(42);
  });

  it("exposes item-master last purchase price and currency separately from the fallback price", () => {
    const [row] = mapProductResults({
      ...baseArgs,
      defaultCurrency: "INR",
      items: [
        {
          AvgPrice: 42,
          ItemCode: "SKU-1",
          ItemName: "Item",
          LastPurCur: "USD",
          LastPurPrc: 37.5,
        },
      ],
      type: "purchase",
    });

    expect(row?.Price).toBe(42);
    expect(row?.Currency).toBe("INR");
    expect(row?.LastPurchasePrice).toBe(37.5);
    expect(row?.LastPurchaseCurrency).toBe("USD");
  });

  it("uses purchase UoM from OITM.BuyUnitMsr / PUoMEntry on purchase catalogs", () => {
    const [row] = mapProductResults({
      ...baseArgs,
      items: [
        {
          ItemCode: "SKU-1",
          ItemName: "Item",
          BuyUnitMsr: "Box",
          PUoMEntry: 2,
          SalUnitMsr: "Pieces",
          SUoMEntry: 1,
        },
      ],
      type: "purchase",
    });

    expect(row?.PurchaseUoMCode).toBe("BOX");
    expect(row?.PurchaseUoMEntry).toBe(2);
    expect(row?.UoMCode).toBe("PCS");
    expect(row?.UoMEntry).toBe(1);
    expect(row?.UomList).toEqual([{ code: "BOX", name: "Box", entry: 2 }]);
  });

  it("uses sales UoM from OITM.SalUnitMsr / SUoMEntry on sales catalogs", () => {
    const [row] = mapProductResults({
      ...baseArgs,
      items: [
        {
          ItemCode: "SKU-1",
          ItemName: "Item",
          BuyUnitMsr: "Box",
          PUoMEntry: 2,
          SalUnitMsr: "Pieces",
          SUoMEntry: 1,
        },
      ],
      type: "sales",
    });

    expect(row?.UoMCode).toBe("PCS");
    expect(row?.UoMEntry).toBe(1);
    expect(row?.PurchaseUoMCode).toBe("BOX");
    expect(row?.UomList).toEqual([{ code: "PCS", name: "Pieces", entry: 1 }]);
  });

  it("does not put UoM-group extras or inventory UoM on the list", () => {
    const [row] = mapProductResults({
      ...baseArgs,
      items: [
        {
          ItemCode: "SKU-1",
          ItemName: "Item",
          BuyUnitMsr: "BOX",
          PUoMEntry: 2,
          SalUnitMsr: "PCS",
          SUoMEntry: 1,
          InvntryUom: "CTN",
          IUoMEntry: 3,
          UgpEntry: 99,
        },
      ],
      type: "purchase",
    });

    expect(row?.UomList?.map((uom: { code: string }) => uom.code)).toEqual(["BOX"]);
  });
});
