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
