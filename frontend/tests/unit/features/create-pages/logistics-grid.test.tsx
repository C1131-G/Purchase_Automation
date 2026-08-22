import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const capturedFieldBlocks = vi.hoisted((): Array<{ label: string; maxLength?: number }> => []);

vi.mock("@/features/create-pages/create-shared/components/core/field-block", () => ({
  FieldBlock: (props: { label: string; maxLength?: number }) => {
    capturedFieldBlocks.push(props);
    return null;
  },
}));

import { LogisticsGrid } from "@/features/create-pages/create-shared/components/grids/logistics-grid";

describe("LogisticsGrid", () => {
  it("does not constrain the warehouse lookup display to the warehouse-code length", () => {
    capturedFieldBlocks.length = 0;

    renderToStaticMarkup(
      <LogisticsGrid
        salesEmployeeInput=""
        salesEmployeesLoading={false}
        salesEmployeeFocused={false}
        salesEmployeeSuggestions={[]}
        onSalesEmployeeChange={vi.fn()}
        onSalesEmployeeFocus={vi.fn()}
        onSalesEmployeeBlur={vi.fn()}
        onOpenSalesEmployeePopup={vi.fn()}
        onSelectSalesEmployee={vi.fn()}
        showWarehouseInsteadOfDocNum
        warehouseInput="Lautoka Main Warehouse [L101]"
        onWarehouseChange={vi.fn()}
        onWarehouseFocus={vi.fn()}
        onWarehouseBlur={vi.fn()}
        onOpenWarehousePopup={vi.fn()}
        onSelectWarehouse={vi.fn()}
        showBranch
        branchInput="Lautoka Branch (3)"
        onBranchChange={vi.fn()}
        onBranchFocus={vi.fn()}
        onBranchBlur={vi.fn()}
        onOpenBranchPopup={vi.fn()}
        onSelectBranch={vi.fn()}
      />,
    );

    expect(
      capturedFieldBlocks.find((field) => field.label === "WAREHOUSE")?.maxLength,
    ).toBeUndefined();
    expect(
      capturedFieldBlocks.find((field) => field.label === "BRANCH")?.maxLength,
    ).toBeUndefined();
  });
});
