import { beforeEach, describe, expect, it, vi } from "vitest";

const loadOscnForCardCode = vi.fn();
const loadItemNamesByCodes = vi.fn();
const loadOscnWarehouseHints = vi.fn();

vi.mock("@/modules/master-data/master-data.oscn", () => ({
  loadOscnForCardCode: (...args: unknown[]) => loadOscnForCardCode(...args),
  loadItemNamesByCodes: (...args: unknown[]) => loadItemNamesByCodes(...args),
  loadOscnWarehouseHints: (...args: unknown[]) => loadOscnWarehouseHints(...args),
  filterExistingTargetItemCodes: async (db: string, codes: string[]) => {
    const names = await loadItemNamesByCodes(db, codes);
    return new Set((names as Map<string, string>).keys());
  },
}));

import {
  applyPartnerItemMapToLines,
  IcItemCodeMappingError,
  mapSourceItemsToPartnerItems,
} from "@/modules/intercompany/config/item-mapping/partner-item.mapping";

describe("partner-item.mapping (OSCN Substitute)", () => {
  beforeEach(() => {
    loadOscnForCardCode.mockReset();
    loadItemNamesByCodes.mockReset();
    loadOscnWarehouseHints.mockReset();
    loadOscnWarehouseHints.mockResolvedValue(new Map());
  });

  it("maps buyer ItemCode → Substitute and partner OITM ItemName", async () => {
    loadOscnForCardCode.mockResolvedValue([
      {
        ItemCode: "AJAX-SKU-1",
        CardCode: "V-RCM",
        Substitute: "RCM-SKU-1",
        Descriptio: "OSCN catalog text",
      },
    ]);
    loadItemNamesByCodes.mockResolvedValue(new Map([["RCM-SKU-1", "RCM Master Name"]]));

    const map = await mapSourceItemsToPartnerItems({
      sourceDbName: "AJAX_DB",
      partnerCardCode: "V-RCM",
      itemCodes: ["AJAX-SKU-1"],
      targetDbName: "RCM_DB",
    });

    expect(map.get("AJAX-SKU-1")).toEqual({
      sourceItemCode: "AJAX-SKU-1",
      partnerItemCode: "RCM-SKU-1",
      description: "RCM Master Name",
      warehouseHint: "",
    });
    expect(loadOscnForCardCode).toHaveBeenCalledWith("AJAX_DB", "V-RCM", ["AJAX-SKU-1"]);
    expect(loadItemNamesByCodes).toHaveBeenCalledWith("RCM_DB", ["RCM-SKU-1"]);
  });

  it("fails when OSCN row is missing for a line item", async () => {
    loadOscnForCardCode.mockResolvedValue([]);
    loadItemNamesByCodes.mockResolvedValue(new Map());

    await expect(
      mapSourceItemsToPartnerItems({
        sourceDbName: "AJAX_DB",
        partnerCardCode: "V-RCM",
        itemCodes: ["MISSING"],
        targetDbName: "RCM_DB",
      }),
    ).rejects.toBeInstanceOf(IcItemCodeMappingError);
  });

  it("fails when Substitute is empty", async () => {
    loadOscnForCardCode.mockResolvedValue([
      { ItemCode: "A1", CardCode: "V-RCM", Substitute: "", Descriptio: "" },
    ]);

    await expect(
      mapSourceItemsToPartnerItems({
        sourceDbName: "AJAX_DB",
        partnerCardCode: "V-RCM",
        itemCodes: ["A1"],
        targetDbName: "RCM_DB",
      }),
    ).rejects.toMatchObject({ emptySubstituteCodes: ["A1"] });
  });

  it("fails when Substitute is not on partner OITM", async () => {
    loadOscnForCardCode.mockResolvedValue([
      { ItemCode: "A1", CardCode: "V-RCM", Substitute: "R1", Descriptio: "" },
    ]);
    loadItemNamesByCodes.mockResolvedValue(new Map());

    await expect(
      mapSourceItemsToPartnerItems({
        sourceDbName: "AJAX_DB",
        partnerCardCode: "V-RCM",
        itemCodes: ["A1"],
        targetDbName: "RCM_DB",
      }),
    ).rejects.toMatchObject({ missingSubstituteCodes: ["R1"] });
  });

  it("copies OSCN.U_Warehouse hint for seller RFQ warehouse match", async () => {
    loadOscnForCardCode.mockResolvedValue([
      {
        ItemCode: "AJAX-SKU-1",
        CardCode: "V-RCM",
        Substitute: "RCM-SKU-1",
        Descriptio: "OSCN catalog text",
      },
    ]);
    loadItemNamesByCodes.mockResolvedValue(new Map([["RCM-SKU-1", "RCM Master Name"]]));
    loadOscnWarehouseHints.mockResolvedValue(new Map([["AJAX-SKU-1", "Main Store"]]));

    const map = await mapSourceItemsToPartnerItems({
      sourceDbName: "AJAX_DB",
      partnerCardCode: "V-RCM",
      itemCodes: ["AJAX-SKU-1"],
      targetDbName: "RCM_DB",
    });

    expect(map.get("AJAX-SKU-1")?.warehouseHint).toBe("Main Store");
    expect(loadOscnWarehouseHints).toHaveBeenCalledWith("AJAX_DB", "V-RCM", ["AJAX-SKU-1"]);
  });

  it("applyPartnerItemMapToLines rewrites ItemCode fields", () => {
    const partnerMap = new Map([
      [
        "A1",
        {
          sourceItemCode: "A1",
          partnerItemCode: "R1",
          description: "",
          warehouseHint: "",
        },
      ],
    ]);
    const lines = applyPartnerItemMapToLines([{ ItemCode: "A1", Quantity: 2 }], partnerMap);
    expect(lines[0]?.ItemCode).toBe("R1");
    expect((lines[0] as { itemCode?: string }).itemCode).toBe("R1");
  });
});
