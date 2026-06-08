/** useSoLookups: Orchestrates customer and logistics lookups for Sales Orders. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createSharedQueries as salesOrderCreateQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import type { LookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import { formatWarehouseDisplay } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { QUICK_PRODUCT_LIMIT } from "@/features/create-pages/sales-order-create/utils/so-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/sales-order-create/utils/so-create.utils";
import type { SOHeaderState } from "@/store/create/so-create.store";

interface UseSoLookupsProps {
  headerWarehouseCode: string;
  setHeader: (patch: Partial<SOHeaderState>) => void;
  clearFieldError: (field: keyof ProductSearchFieldError) => void;
  closeModal: () => void;
  onWarehouseSelected?: (warehouseCode: string) => void;
}

export function useSoLookups({
  headerWarehouseCode,
  setHeader,
  clearFieldError,
  closeModal,
  onWarehouseSelected,
}: UseSoLookupsProps) {
  const normalizeCodeForCompare = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return "";
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase();
  };

  const queryClient = useQueryClient();
  // Master Data Queries: Backing lookups for customers, warehouses, and sales employees.
  // Errors here are surface-propagated to the orchestrator for UI-level display.
  const vendorsQuery = useQuery(salesOrderCreateQueries.customers());
  const warehousesQuery = useQuery(salesOrderCreateQueries.warehouses());
  const salesEmployeesQuery = useQuery(salesOrderCreateQueries.salesEmployees());

  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [warehouseInput, setWarehouseInput] = useState("");
  const [salesEmployeeInput, setSalesEmployeeInput] = useState("");

  const [billToAddress, setBillToAddress] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");

  const [nameFocused, setNameFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [warehouseFocused, setWarehouseFocused] = useState(false);
  const [salesEmployeeFocused, setSalesEmployeeFocused] = useState(false);

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data]);
  const salesEmployees = useMemo(() => salesEmployeesQuery.data ?? [], [salesEmployeesQuery.data]);
  const rankLookupOptions = (items: ProductLookupItem[], rawSearch: string) => {
    const term = rawSearch.trim().toLowerCase();
    if (!term) {
      return items;
    }

    const score = (item: ProductLookupItem) => {
      const code = item.code.toLowerCase();
      const name = item.name.toLowerCase();
      if (code === term || name === term) {
        return 0;
      }
      if (code.startsWith(term) || name.startsWith(term)) {
        return 1;
      }
      if (code.includes(term) || name.includes(term)) {
        return 2;
      }
      return 3;
    };

    return [...items].toSorted((a, b) => {
      const byScore = score(a) - score(b);
      if (byScore !== 0) {
        return byScore;
      }
      return a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  };

  const limitInlineSuggestions = (items: ProductLookupItem[]) => items;

  const findVendorByCode = (value: string) =>
    (vendors as ProductLookupItem[]).find(
      (vendor) => vendor.code.toLowerCase() === value.trim().toLowerCase(),
    );
  const findVendorByName = (value: string) =>
    (vendors as ProductLookupItem[]).find(
      (vendor) => vendor.name.toLowerCase() === value.trim().toLowerCase(),
    );
  const findWarehouseByCode = (value: string) =>
    (warehouses as ProductLookupItem[]).find(
      (item) => item.code.toLowerCase() === value.trim().toLowerCase(),
    );
  const findWarehouseByName = (value: string) =>
    (warehouses as ProductLookupItem[]).find(
      (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
    );
  const findSalesEmployeeByCode = (value: string) =>
    (salesEmployees as ProductLookupItem[]).find(
      (item) => normalizeCodeForCompare(item.code) === normalizeCodeForCompare(value),
    );
  const findSalesEmployeeByName = (value: string) =>
    (salesEmployees as ProductLookupItem[]).find(
      (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
    );

  const effectiveWarehouseCode = useMemo(() => {
    const lookup = warehouseInput.trim().toLowerCase();
    const match = lookup.match(/^\[(.*?)\]/);
    const codeOrName = match ? match[1]!.trim() : lookup;
    const matched = (warehouses as ProductLookupItem[]).find(
      (item: ProductLookupItem) =>
        item.name.toLowerCase() === codeOrName || item.code.toLowerCase() === codeOrName,
    );
    if (matched?.code) {
      return matched.code;
    }
    return (headerWarehouseCode ?? "").trim();
  }, [warehouseInput, warehouses, headerWarehouseCode]);

  const resolveVendorSalesEmployeeName = (vendor: LookupOption) => {
    const targetCode = normalizeCodeForCompare(vendor.salesEmployeeCode);
    const nameByCode =
      targetCode === ""
        ? ""
        : ((salesEmployees as ProductLookupItem[]).find(
            (item) => normalizeCodeForCompare(item.code) === targetCode,
          )?.name ?? "");
    if (nameByCode) {
      return nameByCode;
    }

    return vendor.salesEmployeeName?.trim() ?? "";
  };

  // Selections
  const selectVendor = (vendor: LookupOption) => {
    const nextBillToAddress = vendor.billToAddress ?? "";
    const nextShipToAddress = vendor.shipToAddress ?? "";
    const associatedSalesEmployeeName = resolveVendorSalesEmployeeName(vendor);
    setHeader({ vendorCode: vendor.code, vendorName: vendor.name });
    setNameInput(vendor.name);
    setCodeInput(vendor.code);
    setSalesEmployeeInput(associatedSalesEmployeeName);

    clearFieldError("vendorName");
    clearFieldError("vendorCode");
    if (associatedSalesEmployeeName) {
      clearFieldError("salesEmployee");
    }
    if (nextBillToAddress.trim()) {
      clearFieldError("billToAddress");
    }
    if (nextShipToAddress.trim()) {
      clearFieldError("shipToAddress");
    }

    setBillToAddress(nextBillToAddress);
    setShipToAddress(nextShipToAddress);
    setNameFocused(false);
    setCodeFocused(false);
    closeModal();
  };

  const selectWarehouse = (item: { code: string; name: string }) => {
    setWarehouseInput(formatWarehouseDisplay(item.name, item.code));
    setHeader({ warehouseCode: item.code });
    clearFieldError("warehouseCode");
    void queryClient.prefetchQuery(
      salesOrderCreateQueries.products(item.code, undefined, QUICK_PRODUCT_LIMIT),
    );
    setWarehouseFocused(false);
    onWarehouseSelected?.(item.code);
    closeModal();
  };

  const selectSalesEmployee = (item: { code: string; name: string }) => {
    setSalesEmployeeInput(item.name);
    clearFieldError("salesEmployee");
    setSalesEmployeeFocused(false);
    closeModal();
  };

  // Handlers
  const handleVendorNameChange = (value: string) => {
    setNameInput(value);
    clearFieldError("vendorName");
    if (value.trim() === "") {
      setNameFocused(true);
      setHeader({ vendorCode: "", vendorName: "" });
      setSalesEmployeeInput("");
      setBillToAddress("");
      setShipToAddress("");
      return;
    }
    const matched = findVendorByName(value);
    if (matched) {
      selectVendor(matched);
      return;
    }
    setSalesEmployeeInput("");
    setBillToAddress("");
    setShipToAddress("");
    setNameFocused(true);
    setHeader({ vendorCode: "", vendorName: value });
  };

  const handleVendorCodeChange = (value: string) => {
    setCodeInput(value);
    clearFieldError("vendorCode");
    if (value.trim() === "") {
      setCodeFocused(true);
      setHeader({ vendorCode: "", vendorName: "" });
      setSalesEmployeeInput("");
      setBillToAddress("");
      setShipToAddress("");
      return;
    }
    const matched = findVendorByCode(value);
    if (matched) {
      selectVendor(matched);
      return;
    }
    setSalesEmployeeInput("");
    setBillToAddress("");
    setShipToAddress("");
    setCodeFocused(true);
    setHeader({ vendorCode: value, vendorName: "" });
  };

  const handleWarehouseChange = (value: string) => {
    setWarehouseInput(value);
    clearFieldError("warehouseCode");
    if (value.trim() === "") {
      setWarehouseFocused(true);
      setHeader({ warehouseCode: "" });
      return;
    }
    const matched = findWarehouseByName(value) ?? findWarehouseByCode(value);
    if (matched) {
      selectWarehouse(matched);
      return;
    }
    setHeader({ warehouseCode: "" });
  };

  const handleSalesEmployeeChange = (value: string) => {
    setSalesEmployeeInput(value);
    clearFieldError("salesEmployee");
    if (!value.trim()) {
      setSalesEmployeeFocused(true);
      return;
    }
    const matched = findSalesEmployeeByName(value) ?? findSalesEmployeeByCode(value);
    if (matched) {
      selectSalesEmployee(matched);
      return;
    }
    setSalesEmployeeFocused(true);
  };

  const nameSuggestions = useMemo(() => {
    const ranked = rankLookupOptions(vendors as ProductLookupItem[], nameInput);
    return limitInlineSuggestions(ranked);
  }, [vendors, nameInput]);

  const codeSuggestions = useMemo(() => {
    const ranked = rankLookupOptions(vendors as ProductLookupItem[], codeInput);
    return limitInlineSuggestions(ranked);
  }, [vendors, codeInput]);

  const warehouseSuggestions = useMemo(() => {
    const ranked = rankLookupOptions(warehouses as ProductLookupItem[], warehouseInput);
    return limitInlineSuggestions(ranked);
  }, [warehouses, warehouseInput]);

  const salesEmployeeSuggestions = useMemo(() => {
    const ranked = rankLookupOptions(salesEmployees as ProductLookupItem[], salesEmployeeInput);
    return limitInlineSuggestions(ranked);
  }, [salesEmployees, salesEmployeeInput]);

  // Robust Name Resolver for Hydration & Copy-From flows
  useEffect(() => {
    if (headerWarehouseCode && warehouses.length > 0) {
      const matched = warehouses.find(
        (w) => String(w.code).trim() === String(headerWarehouseCode).trim(),
      );
      if (matched && warehouseInput !== formatWarehouseDisplay(matched.name, matched.code)) {
        setWarehouseInput(formatWarehouseDisplay(matched.name, matched.code));
      }
    }
  }, [headerWarehouseCode, warehouses, warehouseInput]);

  const resetWarehouse = useCallback(() => {
    setWarehouseInput("");
    setHeader({ warehouseCode: "" });
    setWarehouseFocused(false);
    clearFieldError("warehouseCode");
  }, [setHeader, clearFieldError]);

  return {
    billToAddress,
    codeFocused,
    codeInput,
    codeSuggestions,
    effectiveWarehouseCode,
    findVendorByCode,
    findVendorByName,
    findWarehouseByCode,
    findWarehouseByName,
    handleSalesEmployeeChange,
    handleVendorCodeChange,
    handleVendorNameChange,
    handleWarehouseChange,
    nameFocused,
    nameInput,
    nameSuggestions,
    salesEmployeeFocused,
    salesEmployeeInput,
    salesEmployeeSuggestions,
    salesEmployees,
    salesEmployeesQuery,
    selectSalesEmployee,
    selectVendor,
    selectWarehouse,
    setBillToAddress,
    setCodeFocused,
    setCodeInput,
    setNameFocused,
    setNameInput,
    setSalesEmployeeFocused,
    setSalesEmployeeInput,
    setShipToAddress,
    setWarehouseFocused,
    setWarehouseInput,
    shipToAddress,
    vendors,
    vendorsQuery,
    warehouseFocused,
    warehouseInput,
    warehouseSuggestions,
    warehouses,
    warehousesQuery,
    resetWarehouse,
  };
}
