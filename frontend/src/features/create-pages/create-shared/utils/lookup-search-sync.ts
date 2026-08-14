/** Lookup Search Sync: Synchronizes toolbar search states with specialized lookup popups. */
import type { PopupMode } from "@/features/create-pages/create-shared/utils/create-order.types";

interface LookupSearchSyncHandlers {
  onVendorName: (value: string) => void;
  onVendorCode: (value: string) => void;
  onWarehouse: (value: string) => void;
  onSalesEmployee: (value: string) => void;
  onBranch?: (value: string) => void;
  onSeries?: (value: string) => void;
}

interface LookupSearchInlineValues {
  vendorName: string;
  vendorCode: string;
  warehouse: string;
  salesEmployee: string;
  branch?: string;
  series?: string;
}

export const syncLookupSearchByMode = (
  mode: PopupMode,
  value: string,
  handlers: LookupSearchSyncHandlers,
) => {
  if (mode === "vendor-name") {
    handlers.onVendorName(value);
    return;
  }
  if (mode === "vendor-code") {
    handlers.onVendorCode(value);
    return;
  }
  if (mode === "warehouse") {
    handlers.onWarehouse(value);
    return;
  }
  if (mode === "branch") {
    handlers.onBranch?.(value);
    return;
  }
  if (mode === "series") {
    handlers.onSeries?.(value);
    return;
  }
  handlers.onSalesEmployee(value);
};

export const getLookupInlineSearchByMode = (mode: PopupMode, values: LookupSearchInlineValues) => {
  if (mode === "vendor-name") {
    return values.vendorName;
  }
  if (mode === "vendor-code") {
    return values.vendorCode;
  }
  if (mode === "warehouse") {
    return values.warehouse;
  }
  if (mode === "branch") {
    return values.branch ?? "";
  }
  if (mode === "series") {
    return values.series ?? "";
  }
  return values.salesEmployee;
};
