import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AddressGrid } from "@/features/create-pages/create-shared/components/grids/address-grid";

describe("AddressGrid", () => {
  it("renders Bill To address as readonly with lock icon by default while Ship To is editable", () => {
    const onBillToAddressChange = vi.fn();
    const onShipToAddressChange = vi.fn();

    const html = renderToStaticMarkup(
      <AddressGrid
        billToAddress="123 Industrial Park, Sector 4"
        shipToAddress="Warehouse 5, Dock B"
        onBillToAddressChange={onBillToAddressChange}
        onShipToAddressChange={onShipToAddressChange}
        billToLabel="Pay To Address"
        shipToLabel="Ship To Address"
      />,
    );

    // Bill To textarea must be readonly
    expect(html).toContain('id="po-bill-to-address"');
    expect(html).toMatch(/id="po-bill-to-address"[^>]*readOnly/i);

    // Bill To label must contain lock icon
    expect(html).toContain("lucide-lock");

    // Ship To textarea must also be present
    expect(html).toContain('id="po-ship-to-address"');
    expect(html).not.toMatch(/id="po-ship-to-address"[^>]*readOnly/i);
  });

  it("prevents Backspace and Delete keys on Bill To address textarea", () => {
    let backspacePrevented = false;
    let deletePrevented = false;
    let regularKeyPrevented = false;

    const backspaceEvent = {
      key: "Backspace",
      ctrlKey: false,
      metaKey: false,
      preventDefault: () => {
        backspacePrevented = true;
      },
    };

    const deleteEvent = {
      key: "Delete",
      ctrlKey: false,
      metaKey: false,
      preventDefault: () => {
        deletePrevented = true;
      },
    };

    const charEvent = {
      key: "a",
      ctrlKey: false,
      metaKey: false,
      preventDefault: () => {
        regularKeyPrevented = true;
      },
    };

    const element = AddressGrid({
      billToAddress: "Test Address",
      shipToAddress: "Test Ship Address",
      onShipToAddressChange: vi.fn(),
    });

    const sectionCardChildren = element.props.children;
    const innerContainer = sectionCardChildren.props.children;
    const gridCols = innerContainer.props.children;
    const billToCol = gridCols[0];
    const billToTextarea = billToCol.props.children[2];

    expect(billToTextarea.props.readOnly).toBe(true);

    billToTextarea.props.onKeyDown(backspaceEvent);
    expect(backspacePrevented).toBe(true);

    billToTextarea.props.onKeyDown(deleteEvent);
    expect(deletePrevented).toBe(true);

    billToTextarea.props.onKeyDown(charEvent);
    expect(regularKeyPrevented).toBe(true);
  });

  it("supports dropdown selection to update Bill To address", () => {
    const onBillToChange = vi.fn();
    const options = [
      { addressName: "HQ", addressText: "HQ Address 123" },
      { addressName: "Branch", addressText: "Branch Address 456" },
    ];

    const element = AddressGrid({
      billToAddress: "HQ Address 123",
      shipToAddress: "Ship Address",
      onBillToAddressChange: onBillToChange,
      onShipToAddressChange: vi.fn(),
      billToOptions: options,
    });

    const sectionCardChildren = element.props.children;
    const innerContainer = sectionCardChildren.props.children;
    const gridCols = innerContainer.props.children;
    const billToCol = gridCols[0];
    const selectWrapper = billToCol.props.children[1];
    const select = selectWrapper.props.children;

    select.props.onValueChange("Branch");
    expect(onBillToChange).toHaveBeenCalledWith("Branch Address 456");
  });
});
