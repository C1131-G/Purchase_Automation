/** usePqLookups: Orchestrates Vendor and logistics lookups for Purchase Quotations. */
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSharedQueries as purchaseQuotationCreateQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { formatAddressForDisplay } from "@/features/create-pages/create-shared/utils/address.utils";
import type { LookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import { formatWarehouseDisplay } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { filterLocationLookupOptions } from "@/features/create-pages/create-shared/utils/location-lookup";
import { rankAndLimitLookupOptions } from "@/features/create-pages/create-shared/utils/rank-lookup-options";
import type { ProductSearchFieldError } from "@/features/create-pages/purchase-quotation-create/utils/pq-create.utils";
import type { PQHeaderState } from "@/store/create/pq-create.store";

interface usePqLookupsProps {
  headerWarehouseCode: string;
  setHeader: (patch: Partial<PQHeaderState>) => void;
  clearFieldError: (field: keyof ProductSearchFieldError) => void;
  closeModal: () => void;
  onWarehouseSelected?: (warehouseCode: string) => void;
  onVendorSelected?: (
    vendor: LookupOption,
    previousVendor: {
      billToAddress: string;
      code: string;
      name: string;
      salesEmployeeName: string;
      shipToAddress: string;
    },
  ) => void;
}

export function usePqLookups({
  headerWarehouseCode,
  setHeader,
  clearFieldError,
  closeModal,
  onWarehouseSelected,
  onVendorSelected,
}: usePqLookupsProps) {
  const normalizeCodeForCompare = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return "";
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase();
  };

  // Master Data Queries: Backing lookups for vendors, warehouses, and Buyers.
  // Errors here are surface-propagated to the orchestrator for UI-level display.
  const vendorsQuery = useQuery(purchaseQuotationCreateQueries.vendors());
  const warehousesQuery = useQuery(purchaseQuotationCreateQueries.warehouses());
  const salesEmployeesQuery = useQuery(purchaseQuotationCreateQueries.salesEmployees());
  const uomsQuery = useQuery(purchaseQuotationCreateQueries.uoms());
  const taxCodesQuery = useQuery(purchaseQuotationCreateQueries.taxCodes());

  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [warehouseInput, setWarehouseInput] = useState("");
  const [salesEmployeeInput, setSalesEmployeeInput] = useState("");

  const [billToAddress, setBillToAddressRaw] = useState("");
  const [shipToAddress, setShipToAddressRaw] = useState("");

  const setBillToAddress = useCallback((value: string) => {
    setBillToAddressRaw(formatAddressForDisplay(value));
  }, []);
  const setShipToAddress = useCallback((value: string) => {
    setShipToAddressRaw(formatAddressForDisplay(value));
  }, []);

  const [nameFocused, setNameFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [warehouseFocused, setWarehouseFocused] = useState(false);
  const warehouseDirtyRef = useRef(false);
  const [salesEmployeeFocused, setSalesEmployeeFocused] = useState(false);
  const vendorSelectedRef = useRef(false);
  const warehouseSelectedRef = useRef(false);
  const salesEmployeeSelectedRef = useRef(false);

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data]);
  const salesEmployees = useMemo(() => salesEmployeesQuery.data ?? [], [salesEmployeesQuery.data]);
  const uoms = useMemo(() => uomsQuery.data ?? [], [uomsQuery.data]);
  const taxCodes = useMemo(() => taxCodesQuery.data ?? [], [taxCodesQuery.data]);

  const findVendorByCode = (value: string) =>
    (vendors as ProductLookupItem[]).find(
      (vendor) => vendor.code.toLowerCase() === value.trim().toLowerCase(),
    );
  const findVendorByName = (value: string) =>
    (vendors as ProductLookupItem[]).find(
      (vendor) => vendor.name.toLowerCase() === value.trim().toLowerCase(),
    );
  const effectiveWarehouseCode = useMemo(() => {
    return (headerWarehouseCode ?? "").trim();
  }, [headerWarehouseCode]);

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
    vendorSelectedRef.current = true;
    const previousVendor = {
      billToAddress,
      code: codeInput.trim(),
      name: nameInput.trim(),
      salesEmployeeName: salesEmployeeInput.trim(),
      shipToAddress,
    };
    const vendorChanged =
      previousVendor.code !== "" &&
      previousVendor.code.toLowerCase() !== vendor.code.trim().toLowerCase();
    const nextBillToAddress = vendor.billToAddress ?? "";
    const nextShipToAddress = vendor.shipToAddress ?? "";
    const associatedSalesEmployeeName = resolveVendorSalesEmployeeName(vendor);
    salesEmployeeSelectedRef.current = Boolean(associatedSalesEmployeeName);
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
    if (vendorChanged) {
      onVendorSelected?.(vendor, previousVendor);
    }
  };

  const selectWarehouse = (item: { code: string; name: string }) => {
    warehouseSelectedRef.current = true;
    warehouseDirtyRef.current = false;
    setWarehouseInput(formatWarehouseDisplay(item.name, item.code));
    setHeader({ warehouseCode: item.code });
    clearFieldError("warehouseCode");
    // Products load only after vendor CardCode (OSCN ∩ OITM) — no full OITM prefetch.
    setWarehouseFocused(false);
    onWarehouseSelected?.(item.code);
    closeModal();
  };

  const selectSalesEmployee = (item: { code: string; name: string }) => {
    salesEmployeeSelectedRef.current = true;
    setSalesEmployeeInput(item.name);
    clearFieldError("salesEmployee");
    setSalesEmployeeFocused(false);
    closeModal();
  };

  // Handlers
  const handleVendorNameChange = (value: string) => {
    vendorSelectedRef.current = false;
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
    setSalesEmployeeInput("");
    setBillToAddress("");
    setShipToAddress("");
    setNameFocused(true);
    setCodeInput("");
    setHeader({ vendorCode: "", vendorName: "" });
  };

  const handleVendorCodeChange = (value: string) => {
    vendorSelectedRef.current = false;
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
    setSalesEmployeeInput("");
    setBillToAddress("");
    setShipToAddress("");
    setCodeFocused(true);
    setNameInput("");
    setHeader({ vendorCode: "", vendorName: "" });
  };

  const handleWarehouseChange = (value: string) => {
    warehouseSelectedRef.current = false;
    warehouseDirtyRef.current = true;
    setWarehouseInput(value);
    clearFieldError("warehouseCode");
    if (value.trim() === "") {
      setWarehouseFocused(true);
      setHeader({ warehouseCode: "" });
      return;
    }
    setHeader({ warehouseCode: "" });
    setWarehouseFocused(true);
  };

  const handleSalesEmployeeChange = (value: string) => {
    salesEmployeeSelectedRef.current = false;
    setSalesEmployeeInput(value);
    clearFieldError("salesEmployee");
    if (!value.trim()) {
      setSalesEmployeeFocused(true);
      return;
    }
    setSalesEmployeeFocused(true);
  };

  useEffect(() => {
    if (!nameFocused && !codeFocused && !vendorSelectedRef.current) {
      setNameInput("");
      setCodeInput("");
    }
  }, [codeFocused, nameFocused]);

  useEffect(() => {
    if (
      !warehouseFocused &&
      !warehouseSelectedRef.current &&
      !headerWarehouseCode.trim() &&
      warehouseInput.trim()
    ) {
      setWarehouseInput("");
    }
  }, [headerWarehouseCode, warehouseFocused, warehouseInput]);

  useEffect(() => {
    if (!salesEmployeeFocused && !salesEmployeeSelectedRef.current && salesEmployeeInput.trim()) {
      setSalesEmployeeInput("");
    }
  }, [salesEmployeeFocused, salesEmployeeInput]);

  const nameSuggestions = useMemo(
    () => rankAndLimitLookupOptions(vendors as ProductLookupItem[], nameInput),
    [vendors, nameInput],
  );

  const codeSuggestions = useMemo(
    () => rankAndLimitLookupOptions(vendors as ProductLookupItem[], codeInput),
    [vendors, codeInput],
  );

  const warehouseSuggestions = useMemo(
    () =>
      rankAndLimitLookupOptions(
        filterLocationLookupOptions(warehouses as ProductLookupItem[], warehouseInput),
        warehouseInput,
      ),
    [warehouses, warehouseInput],
  );

  const salesEmployeeSuggestions = useMemo(
    () => rankAndLimitLookupOptions(salesEmployees as ProductLookupItem[], salesEmployeeInput),
    [salesEmployees, salesEmployeeInput],
  );

  // Robust Name Resolver for Hydration & Copy-From flows
  useEffect(() => {
    if (
      warehouseDirtyRef.current ||
      warehouseFocused ||
      !headerWarehouseCode ||
      warehouses.length === 0
    ) {
      return;
    }
    if (headerWarehouseCode && warehouses.length > 0) {
      const matched = warehouses.find(
        (w) => String(w.code).trim() === String(headerWarehouseCode).trim(),
      );
      if (matched && warehouseInput !== formatWarehouseDisplay(matched.name, matched.code)) {
        setWarehouseInput(formatWarehouseDisplay(matched.name, matched.code));
      }
    }
  }, [headerWarehouseCode, warehouseFocused, warehouses, warehouseInput]);

  const resetWarehouse = useCallback(() => {
    warehouseDirtyRef.current = false;
    setWarehouseInput("");
    setHeader({ warehouseCode: "" });
    setWarehouseFocused(false);
    clearFieldError("warehouseCode");
  }, [setHeader, clearFieldError]);

  const finalizeVendorLookup = () => {
    if (!vendorSelectedRef.current) {
      setNameInput("");
      setCodeInput("");
    }
    setNameFocused(false);
    setCodeFocused(false);
  };

  const finalizeWarehouseLookup = () => {
    if (!warehouseSelectedRef.current && !headerWarehouseCode.trim()) {
      setWarehouseInput("");
    }
    setWarehouseFocused(false);
  };

  const finalizeSalesEmployeeLookup = () => {
    if (!salesEmployeeSelectedRef.current) {
      setSalesEmployeeInput("");
    }
    setSalesEmployeeFocused(false);
  };

  return {
    billToAddress,
    codeFocused,
    codeInput,
    codeSuggestions,
    effectiveWarehouseCode,
    findVendorByCode,
    findVendorByName,
    handleSalesEmployeeChange,
    handleVendorCodeChange,
    handleVendorNameChange,
    handleWarehouseChange,
    finalizeVendorLookup,
    finalizeWarehouseLookup,
    finalizeSalesEmployeeLookup,
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
    uoms,
    uomsQuery,
    taxCodes,
    taxCodesQuery,
  };
}
