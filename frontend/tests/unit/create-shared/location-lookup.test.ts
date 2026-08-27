import { describe, expect, it, vi } from "vitest";

import {
  getLookupInlineSearchByMode,
  syncLookupSearchByMode,
} from "@/features/create-pages/create-shared/utils/lookup-search-sync";
import {
  filterLocationLookupOptions,
  findBranchSelection,
  findWarehouseSelection,
} from "@/features/create-pages/create-shared/utils/location-lookup";

const warehouses = [
  { code: "L101", name: "Lautoka Main Warehouse" },
  { code: "S202", name: "Suva Depot" },
];

const branches = [{ code: "3", name: "Lautoka Branch" }];

describe("warehouse and branch lookup editing", () => {
  it("searches both names and codes without auto-selecting exact names", () => {
    expect(filterLocationLookupOptions(warehouses, "lautoka")).toEqual([warehouses[0]]);
    expect(filterLocationLookupOptions(warehouses, "s20")).toEqual([warehouses[1]]);
    expect(findWarehouseSelection(warehouses, "Lautoka Main Warehouse")).toBeUndefined();
    expect(findBranchSelection(branches, "Lautoka Branch")).toBeUndefined();
  });

  it("auto-selects exact codes and complete formatted values", () => {
    expect(findWarehouseSelection(warehouses, " l101 ")).toEqual(warehouses[0]);
    expect(findWarehouseSelection(warehouses, "Lautoka Main Warehouse [L101]")).toEqual(
      warehouses[0],
    );
    expect(findBranchSelection(branches, "Lautoka Branch (3)")).toEqual(branches[0]);
  });

  it("sends popup warehouse and branch edits through the live field handlers", () => {
    const onWarehouse = vi.fn();
    const onBranch = vi.fn();
    const handlers = {
      onVendorName: vi.fn(),
      onVendorCode: vi.fn(),
      onWarehouse,
      onSalesEmployee: vi.fn(),
      onBranch,
    };

    syncLookupSearchByMode("warehouse", "L10", handlers);
    syncLookupSearchByMode("branch", "Lau", handlers);

    expect(onWarehouse).toHaveBeenCalledWith("L10");
    expect(onBranch).toHaveBeenCalledWith("Lau");
  });

  it("can keep popup search text isolated from the inline field", () => {
    const onWarehouse = vi.fn();
    const handlers = {
      onVendorName: vi.fn(),
      onVendorCode: vi.fn(),
      onWarehouse,
      onSalesEmployee: vi.fn(),
    };

    syncLookupSearchByMode("warehouse", "random", handlers, false);

    expect(onWarehouse).not.toHaveBeenCalled();
  });

  it("uses the current location text only as the initial popup query", () => {
    expect(
      getLookupInlineSearchByMode("warehouse", {
        warehouse: "Lautoka Main Warehouse [L101]",
        branch: "Lautoka Branch (3)",
        vendorName: "",
        vendorCode: "",
        salesEmployee: "",
      }),
    ).toBe("Lautoka Main Warehouse [L101]");
    expect(
      getLookupInlineSearchByMode("branch", {
        warehouse: "",
        branch: "Lautoka Branch (3)",
        vendorName: "",
        vendorCode: "",
        salesEmployee: "",
      }),
    ).toBe("Lautoka Branch (3)");
  });
});
