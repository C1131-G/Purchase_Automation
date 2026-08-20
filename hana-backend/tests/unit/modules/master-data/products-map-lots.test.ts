import { describe, expect, it } from "vitest";

import { mapProductResults } from "@/modules/master-data/master-data.products-map";

describe("mapProductResults lot flags", () => {
  it("returns ManBtchNum and ManSerNum from OITM", () => {
    const [row] = mapProductResults({
      defaultCurrency: "USD",
      itemPrices: [],
      itemStocks: [],
      items: [
        {
          ItemCode: "SKU-1",
          FrgnName: "Imported item description",
          ItemName: "Batch item",
          ManBtchNum: "Y",
          ManSerNum: "N",
          VatGroupPu: "IN-18",
        },
      ],
      normalizedWarehouseCode: "01",
      priceList: undefined,
      taxGroups: [{ Code: "IN-18", Rate: 18 }],
      type: "purchase",
      ugpLines: [],
      uoms: [],
    });

    expect(row?.ManBtchNum).toBe("Y");
    expect(row?.ManSerNum).toBe("N");
    expect(row?.manBtchNum).toBe("Y");
    expect(row?.manSerNum).toBe("N");
    expect(row?.FrgnName).toBe("Imported item description");
    expect(row?.foreignName).toBe("Imported item description");
  });
});
