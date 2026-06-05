import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useCreateArCreditMemoMutation,
  useUpdateArCreditMemoMutation,
} from "@/features/create-pages/ar-credit-memo-create/api/ar-credit-memo-create.mutations";
import { useArCnProducts } from "@/features/create-pages/ar-credit-memo-create/hooks/use-ar-cm-products";
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  MANDATORY_ERROR_TEXT,
} from "@/features/create-pages/ar-credit-memo-create/utils/ar-credit-memo-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/ar-credit-memo-create/utils/ar-credit-memo-create.utils";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { calculateOrderTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import { formatWarehouseDisplay } from "@/features/create-pages/create-shared/utils/create-order.utils";
import type {
  CreateLookupOption,
  PopupMode,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { documentActionToast } from "@/features/create-pages/create-shared/utils/document-action-toast";
import { arCreditMemoQueries } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.queries";
import { arInvoiceQueries } from "@/features/table-pages/ar-invoices/api/ar-invoice.queries";
import { arInvoiceAPI } from "@/features/table-pages/ar-invoices/api/ar-invoice.service";
import { useMutation } from "@tanstack/react-query";

interface UseArCreditMemoCreateProps {
  mode?: "create" | "edit";
  docNum?: string | undefined;
  sourceDocNum?: string | undefined;
  sourceDocType?: string | undefined;
}

export function useArCreditMemoCreate({
  mode = "create",
  docNum,
  sourceDocNum,
  sourceDocType,
}: UseArCreditMemoCreateProps = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [header, setHeaderState] = useState({
    billToAddress: "",
    comments: "",
    docDate: new Date().toISOString().split("T")[0]!,
    docDueDate: new Date().toISOString().split("T")[0]!,
    referenceNo: "",
    shipToAddress: "",
    vendorCode: "",
    vendorName: "",
    warehouseCode: "",
  });

  const setHeader = useCallback(
    (patch: Partial<typeof header>) => setHeaderState((prev) => ({ ...prev, ...patch })),
    [],
  );

  const [createError, setCreateError] = useState<string | null>(null);
  const [missingSearchMandatoryFields] = useState<ProductSearchFieldError>(
    EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  );

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<PopupMode>("vendor-name");
  const [modalSearch, setModalSearch] = useState("");
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [stockPreviewProduct, setStockPreviewProduct] = useState<{
    code: string;
    name: string;
  } | null>(null);

  // Customer lookup inputs
  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [salesEmployeeInput, setSalesEmployeeInput] = useState("");
  const [salesEmployeeFocused, setSalesEmployeeFocused] = useState(false);
  const [warehouseInput, setWarehouseInput] = useState("");
  const [warehouseFocused, setWarehouseFocused] = useState(false);

  const hydratedDocNumRef = useRef<string | null>(null);

  // Lookup data queries
  const vendorsQuery = useQuery(createSharedQueries.customers());
  const warehousesQuery = useQuery(createSharedQueries.warehouses());
  const salesEmployeesQuery = useQuery(createSharedQueries.salesEmployees());

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data]);
  const salesEmployees = useMemo(() => salesEmployeesQuery.data ?? [], [salesEmployeesQuery.data]);

  // Derived vendor name/code suggestions
  const nameSuggestions = useMemo(() => {
    const term = nameInput.trim().toLowerCase();
    if (!term) {
      return vendors;
    }
    return [...vendors].filter(
      (v) => v.name.toLowerCase().includes(term) || v.code.toLowerCase().includes(term),
    );
  }, [vendors, nameInput]);

  const codeSuggestions = useMemo(() => {
    const term = codeInput.trim().toLowerCase();
    if (!term) {
      return vendors;
    }
    return [...vendors].filter(
      (v) => v.code.toLowerCase().includes(term) || v.name.toLowerCase().includes(term),
    );
  }, [vendors, codeInput]);

  const salesEmployeeSuggestions = useMemo(() => {
    const term = salesEmployeeInput.trim().toLowerCase();
    if (!term) {
      return salesEmployees;
    }
    return [...salesEmployees].filter(
      (e) => e.name.toLowerCase().includes(term) || String(e.code).includes(term),
    );
  }, [salesEmployees, salesEmployeeInput]);

  const warehouseSuggestions = useMemo(() => {
    const term = warehouseInput.trim().toLowerCase();
    if (!term) {
      return warehouses;
    }
    return [...warehouses].filter(
      (w) => w.name.toLowerCase().includes(term) || w.code.toLowerCase().includes(term),
    );
  }, [warehouses, warehouseInput]);

  // Modal helpers
  const openPopup = (mode: PopupMode) => {
    setModalMode(mode);
    if (mode === "vendor-name") {
      setModalSearch(nameInput);
    } else if (mode === "vendor-code") {
      setModalSearch(codeInput);
    } else if (mode === "sales-employee") {
      setModalSearch(salesEmployeeInput);
    } else if (mode === "warehouse") {
      setModalSearch(warehouseInput);
    }
    setModalOpen(true);
  };

  const selectVendor = (item: {
    code: string;
    name: string;
    billToAddress?: string | undefined;
    shipToAddress?: string | undefined;
    salesEmployeeName?: string | undefined;
  }) => {
    setNameInput(item.name);
    setCodeInput(item.code);
    setHeader({ vendorCode: item.code, vendorName: item.name });
    setNameFocused(false);
    setCodeFocused(false);
    setModalOpen(false);
  };

  const selectWarehouse = (item: { code: string; name: string }) => {
    setWarehouseInput(formatWarehouseDisplay(item.name, item.code));
    setHeader({ warehouseCode: item.code });
    productsHook.setProductRows((prev) =>
      prev.map((row) => ({
        ...row,
        warehouseCode: item.code,
      })),
    );
    setWarehouseFocused(false);
    setModalOpen(false);
  };

  const selectSalesEmployee = (item: { code: string; name: string }) => {
    setSalesEmployeeInput(item.name);
    setSalesEmployeeFocused(false);
    setModalOpen(false);
  };

  const handleVendorNameChange = (value: string) => {
    setNameInput(value);
    const matched = vendors.find((v) => v.name.toLowerCase() === value.trim().toLowerCase());
    if (matched) {
      selectVendor(matched);
      return;
    }
    setHeader({ vendorCode: "", vendorName: value });
  };

  const handleVendorCodeChange = (value: string) => {
    setCodeInput(value);
    const matched = vendors.find((v) => v.code.toLowerCase() === value.trim().toLowerCase());
    if (matched) {
      selectVendor(matched);
      return;
    }
    setHeader({ vendorCode: value, vendorName: "" });
  };

  const handleWarehouseChange = (value: string) => {
    setWarehouseInput(value);
    if (value.trim() === "") {
      setWarehouseFocused(true);
      setHeader({ warehouseCode: "" });
      return;
    }
    const matched = warehouses.find(
      (w) =>
        w.name.toLowerCase() === value.trim().toLowerCase() ||
        w.code.toLowerCase() === value.trim().toLowerCase(),
    );
    if (matched) {
      selectWarehouse(matched);
      return;
    }
    setHeader({ warehouseCode: "" });
  };

  const handleSalesEmployeeChange = (value: string) => {
    setSalesEmployeeInput(value);
  };

  // Popup results filtered by modal
  const popupResults = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();
    const source =
      modalMode === "vendor-name" || modalMode === "vendor-code"
        ? vendors
        : modalMode === "warehouse"
          ? warehouses
          : salesEmployees;
    if (!term) {
      return source;
    }
    return source.filter(
      (item) =>
        item.name.toLowerCase().includes(term) || String(item.code).toLowerCase().includes(term),
    );
  }, [vendors, warehouses, salesEmployees, modalSearch, modalMode]);

  // ---- Source document hydration (AR Invoice → Credit Memo OR Edit existing) ----
  const isEditMode = mode === "edit";

  const sourceInvoiceQuery = useQuery({
    ...arInvoiceQueries.detailByDocNum(sourceDocNum || ""),
    enabled:
      !isEditMode &&
      !!sourceDocNum &&
      (sourceDocType === "AR_INVOICE" || sourceDocType === "ARInvoice"),
  });

  const editDetailQuery = useQuery({
    ...arCreditMemoQueries.detailByDocNum(docNum || ""),
    enabled: isEditMode && !!docNum,
  });

  const productsHook = useArCnProducts({
    customerLookupToken: header.vendorCode,
    customerSelected: !!header.vendorCode,
    effectiveWarehouseCode: header.warehouseCode,
    productPopupOpen,
    productSearch,
    setProductPopupOpen,
    setProductSearch,
    stockPreviewProductCode: stockPreviewProduct?.code,
  });

  useEffect(() => {
    const isHydratingFromSource = !isEditMode && !!sourceInvoiceQuery.data;
    const isHydratingFromEdit = isEditMode && !!editDetailQuery.data;

    if (!isHydratingFromSource && !isHydratingFromEdit) {
      return;
    }

    const rawDocNum = String(isEditMode ? docNum : sourceDocNum);
    const rawDocType = String(sourceDocType ?? "");
    const cleanDocNum = rawDocNum.replaceAll(/["']/g, "").trim();
    const cleanDocType = rawDocType.replaceAll(/["']/g, "").trim();

    if (hydratedDocNumRef.current === cleanDocNum) {
      return;
    }

    void (async () => {
      const rawDetail = isEditMode ? editDetailQuery.data : sourceInvoiceQuery.data;
      const detail = (rawDetail?.data as unknown as Record<string, unknown>) ?? rawDetail;
      const vendorCode = (detail as Record<string, unknown>).CardCode || "";
      const vendorName = (detail as Record<string, unknown>).CardName || "";
      const comments = (detail as Record<string, unknown>).Comments || "";
      const referenceNo = (detail as Record<string, unknown>).NumAtCard || "";
      const billToAddress = (detail as Record<string, unknown>).Address || "";
      const shipToAddress = (detail as Record<string, unknown>).Address2 || "";
      const salesPersonCode = (detail as Record<string, unknown>).SalesPersonCode;

      const detailLines = ((detail as Record<string, unknown>).DocumentLines || []) as Record<
        string,
        unknown
      >[];
      // Warehouse lives on document lines, not on the invoice header.
      // Read it from the first line — same pattern used by AR Invoice create/edit hydration.
      const warehouseCode = String(
        detailLines[0]?.WarehouseCode ?? (detail as Record<string, unknown>).WarehouseCode ?? "",
      ).trim();
      const itemCodes = [
        ...new Set(
          detailLines.map((l: Record<string, unknown>) => String(l.ItemCode ?? "")).filter(Boolean),
        ),
      ];

      const [productMetaResponse, stocksResponse] = await Promise.all([
        queryClient.fetchQuery(
          createSharedQueries.products(undefined, undefined, itemCodes.length || 10, "sales"),
        ),
        Promise.all(
          itemCodes.map((code) =>
            queryClient.fetchQuery(createSharedQueries.productWarehouseStocks(code as string)),
          ),
        ),
      ]);

      const productByCode = new Map(productMetaResponse.map((p) => [p.code, p]));
      const stocksByCode = new Map(itemCodes.map((code, i) => [code, stocksResponse[i]]));

      const mappedRows = detailLines.map((line: Record<string, unknown>, index: number) => {
        const itemCode = String(line.ItemCode ?? "");
        const productMeta = productByCode.get(itemCode);
        const lineWarehouse = String(line.WarehouseCode || warehouseCode);
        const warehouseStocks = (stocksByCode.get(itemCode) || []) as Record<string, unknown>[];
        const lineStock = lineWarehouse
          ? Number(warehouseStocks.find((s) => String(s.code).trim() === lineWarehouse)?.stock ?? 0)
          : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);

        return {
          baseEntry:
            Number(
              (detail as Record<string, unknown>).DocEntry ||
                (detail as Record<string, unknown>).id,
            ) || undefined,
          baseLine: Number(line.LineNum ?? index),
          baseQuantity: Number(line.Quantity || 1),
          baseType: cleanDocType === "AR_INVOICE" || cleanDocType === "ARInvoice" ? 13 : -1,
          comment: "",
          currency: String(
            (detail as Record<string, unknown>).DocCurr || productMeta?.currency || "",
          ),
          discountAmount:
            (Number(line.Price ?? line.UnitPrice ?? 0) *
              Number(line.Quantity ?? 0) *
              (Number(line.DiscountPercent ?? 0) !== 0
                ? Number(line.DiscountPercent ?? 0)
                : Number((detail as Record<string, unknown>).DiscountPercent ?? 0))) /
            100,
          discountPercent:
            Number(line.DiscountPercent ?? 0) !== 0
              ? Number(line.DiscountPercent ?? 0)
              : Number((detail as Record<string, unknown>).DiscountPercent ?? 0),
          id: `row-copy-${cleanDocNum}-${index}`,
          price: Number(line.Price || line.UnitPrice || productMeta?.price || 0),
          productCode: itemCode,
          productName: String(line.ItemDescription || productMeta?.name || ""),
          quantity: isEditMode
            ? Number(line.Quantity ?? 0)
            : line.LineStatus === "C" || line.LineStatus === "bost_Close"
              ? 0
              : Number(
                  line.RemainingOpenQuantity ??
                    line.OpenQuantity ??
                    line.OpenQty ??
                    line.Quantity ??
                    1,
                ),
          returnReason: String((line as Record<string, unknown>).U_ReturnReason || ""),
          selected: isEditMode,
          stock: lineStock,
          taxRate:
            line.VatPrcnt !== undefined ? Number(line.VatPrcnt) : Number(productMeta?.taxRate ?? 0),
          uomCode: String(line.UoMCode ?? productMeta?.uomCode ?? ""),
          uomEntry: Number(line.UoMEntry ?? productMeta?.uomEntry ?? 0) || undefined,
          vatGroup: String(line.VatGroup || line.TaxCode || productMeta?.vatGroup || ""),
          warehouseCode: lineWarehouse,
        };
      });

      // Resolve the sales employee name from code
      let salesEmployeeName = "";
      if (salesPersonCode !== undefined && salesPersonCode !== null) {
        const employeesData = await queryClient.fetchQuery(createSharedQueries.salesEmployees());
        const matched = employeesData.find((e) => String(e.code) === String(salesPersonCode));
        salesEmployeeName = matched?.name || "";
      }

      setNameInput(String(vendorName));
      setCodeInput(String(vendorCode));
      if (salesEmployeeName) {
        setSalesEmployeeInput(salesEmployeeName);
      }
      // Resolve warehouse display name eagerly so the header field is populated on arrival.
      // The reactive useEffect (header.warehouseCode + warehouses) also updates it once the
      // warehouses list is available, providing a belt-and-suspenders approach.
      if (warehouseCode) {
        const matchedWarehouse = warehouses.find((w) => String(w.code).trim() === warehouseCode);
        setWarehouseInput(
          formatWarehouseDisplay(matchedWarehouse?.name ?? warehouseCode, warehouseCode),
        );
      }
      setHeader({
        billToAddress: String(billToAddress),
        comments: isEditMode
          ? String(comments)
          : `Based on AR Invoice ${cleanDocNum}. ${String(comments)}`,
        docDate: new Date().toISOString().split("T")[0]!,
        docDueDate: new Date().toISOString().split("T")[0]!,
        referenceNo: String(referenceNo),
        shipToAddress: String(shipToAddress),
        vendorCode: String(vendorCode),
        vendorName: String(vendorName),
        warehouseCode: String(warehouseCode),
      });
      productsHook.setProductRows(mappedRows);
      hydratedDocNumRef.current = cleanDocNum;
    })();
  }, [
    editDetailQuery.data,
    sourceInvoiceQuery.data,
    sourceDocNum,
    docNum,
    isEditMode,
    queryClient,
    sourceDocType,
    productsHook,
    setNameInput,
    setCodeInput,
    setSalesEmployeeInput,
    setHeader,
  ]);

  // Robust Name Resolver for Hydration & Copy-From flows
  useEffect(() => {
    if (header.warehouseCode && warehouses.length > 0) {
      const matched = warehouses.find(
        (w) => String(w.code).trim() === String(header.warehouseCode).trim(),
      );
      if (matched && warehouseInput !== formatWarehouseDisplay(matched.name, matched.code)) {
        setWarehouseInput(formatWarehouseDisplay(matched.name, matched.code));
      }
    }
  }, [header.warehouseCode, warehouses, warehouseInput]);

  const sourceInvoiceData = sourceInvoiceQuery.data?.data as Record<string, unknown> | undefined;
  const isSourceClosed = sourceInvoiceData?.DocStatus === "C";

  const reopenInvoiceMutation = useMutation({
    mutationFn: async () => {
      const entry = Number(sourceInvoiceData?.DocEntry ?? sourceInvoiceData?.id);
      if (!entry) throw new Error("No source invoice ID found");
      return arInvoiceAPI.reopenARInvoice(entry);
    },
    onSuccess: () => {
      const toastHandle = documentActionToast("Base Invoice", "update");
      void queryClient.invalidateQueries({
        queryKey: arInvoiceQueries.detailByDocNum(sourceDocNum || "").queryKey,
      });
      toastHandle.success();
    },
    onError: (err) => {
      console.error("Failed to reopen base invoice", (err as Error).message);
    },
  });

  // Mutations
  const createArCreditMemoMutation = useCreateArCreditMemoMutation();
  const updateArCreditMemoMutation = useUpdateArCreditMemoMutation();

  // Totals — only compute from selected (checked) rows
  const selectedRows = useMemo(
    () => productsHook.productRows.filter((r) => r.selected),
    [productsHook.productRows],
  );
  const totals = useMemo(() => calculateOrderTotals(selectedRows), [selectedRows]);

  const missingMandatoryFields = useMemo(() => {
    const missing: string[] = [];
    if (!header.vendorCode) {
      missing.push(MANDATORY_ERROR_TEXT.vendorCode);
    }
    if (!header.docDueDate) {
      missing.push(MANDATORY_ERROR_TEXT.docDueDate);
    }
    if (productsHook.productRows.length === 0) {
      missing.push("At least one product is required.");
    } else if (selectedRows.length === 0) {
      missing.push("Select at least one product to return.");
    }
    return missing;
  }, [header.vendorCode, header.docDueDate, productsHook.productRows.length, selectedRows.length]);

  const requiredCompletionPercent = useMemo(() => {
    const fields = [header.vendorCode, header.docDueDate, selectedRows.length > 0];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [header.vendorCode, header.docDueDate, selectedRows.length]);

  const handleCreateOrder = async () => {
    if (missingMandatoryFields.length > 0) {
      setCreateError(missingMandatoryFields[0] || "Please fill all required fields.");
      return;
    }

    if (isEditMode) {
      const detail = ((editDetailQuery.data as Record<string, unknown>)?.data ??
        editDetailQuery.data) as Record<string, unknown>;
      const existingDocDueDate = String(detail?.DocDueDate ?? "")
        .slice(0, 10)
        .trim();
      const existingComments = String(detail?.Comments ?? "").trim();
      const existingReferenceNo = String(detail?.NumAtCard ?? "").trim();

      const currentDocDueDate = String(header.docDueDate ?? "").trim();
      const currentComments = String(header.comments ?? "").trim();
      const currentReferenceNo = String(header.referenceNo ?? "").trim();

      if (
        currentDocDueDate === existingDocDueDate &&
        currentComments === existingComments &&
        currentReferenceNo === existingReferenceNo
      ) {
        const noChangeMessage = "Change at least one field before update.";
        setCreateError(noChangeMessage);
        return;
      }

      const payload = {
        Comments: currentComments || undefined,
        DocDueDate: header.docDueDate || undefined,
        NumAtCard: currentReferenceNo || undefined,
      };

      const toastHandle = documentActionToast("A/R Credit Memo", "update");
      try {
        const docEntry = detail?.DocEntry ?? detail?.id;
        await updateArCreditMemoMutation.mutateAsync({
          id: docEntry as string | number,
          payload,
        });
        toastHandle.success();
        setWarehouseInput("");
        setHeader({ warehouseCode: "" });
        void navigate({
          search: { limit: 10, page: 1 },
          to: "/sales/ar-credit-memo",
        } as never);
      } catch (_error) {
        toastHandle.error();
        setCreateError((_error as Error).message || "Failed to update A/R Credit Memo");
      }
      return;
    }

    // Try to reopen the invoice if it's closed, as requested.
    // We catch and swallow the error if SAP doesn't support reopening this specific invoice,
    // so we can still attempt to create the linked Credit Memo!
    if (isSourceClosed) {
      try {
        const entry = Number(sourceInvoiceData?.DocEntry ?? sourceInvoiceData?.id);
        if (entry) {
          await arInvoiceAPI.reopenARInvoice(entry);
        }
      } catch (err) {
        console.warn(
          `SAP Reopen failed (continuing to Credit Memo creation): ${(err as Error).message}`,
        );
      }
    }

    const payload = {
      CardCode: header.vendorCode,
      Comments: header.comments,
      DocDate: header.docDate,
      DocDueDate: header.docDueDate,
      DocumentLines: selectedRows.map((row) => {
        const line: Record<string, unknown> = {
          BaseEntry: row.baseEntry,
          BaseLine: row.baseLine,
          BaseType: row.baseType,
          DiscountPercent: row.discountPercent,
          ItemCode: row.productCode,
          Quantity: row.quantity,
          U_ReturnReason: row.returnReason || "",
          UnitPrice: row.price,
          UoMCode: row.uomCode,
          UoMEntry: row.uomEntry,
          VatGroup: row.vatGroup,
          WarehouseCode: row.warehouseCode || header.warehouseCode.trim() || undefined,
        };

        return line;
      }),
      NumAtCard: header.referenceNo,
    };

    const toastHandle = documentActionToast("A/R Credit Memo", "create");
    try {
      await createArCreditMemoMutation.mutateAsync(payload);
      // Invalidate AR Invoice cache so that remaining quantities are updated immediately
      void queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      toastHandle.success();
      setWarehouseInput("");
      setHeader({ warehouseCode: "" });
      void navigate({
        search: { limit: 10, page: 1 },
        to: "/sales/ar-credit-memo",
      } as never);
    } catch (_error) {
      toastHandle.error();
      setCreateError((_error as Error).message || "Failed to create A/R Credit Memo");
    }
  };

  return {
    isEditMode,
    docNum,
    // Header
    header,
    setHeader,
    // Lookups
    vendorsQuery,
    warehousesQuery,
    salesEmployeesQuery,
    vendors,

    salesEmployees,
    nameInput,
    setNameInput,
    codeInput,
    setCodeInput,
    nameFocused,
    setNameFocused,
    codeFocused,
    setCodeFocused,
    nameSuggestions,
    codeSuggestions,
    salesEmployeeInput,
    setSalesEmployeeInput,
    salesEmployeeFocused,
    setSalesEmployeeFocused,
    salesEmployeeSuggestions,
    warehouseInput,
    setWarehouseInput,
    warehouseFocused,
    setWarehouseFocused,
    warehouseSuggestions,
    handleWarehouseChange,
    handleVendorNameChange,
    handleVendorCodeChange,
    handleSalesEmployeeChange,
    selectVendor,
    selectWarehouse,
    selectSalesEmployee,
    openPopup,
    // Modals
    modalOpen,
    setModalOpen,
    modalMode,
    setModalMode,
    modalSearch,
    setModalSearch,
    productPopupOpen,
    setProductPopupOpen,
    productSearch,
    setProductSearch,
    stockPreviewProduct,
    setStockPreviewProduct,
    popupResults,
    handleLookupModalSearchSync: (_mode: PopupMode, value: string) => setModalSearch(value),
    // Products
    productsHook,
    ...productsHook,
    effectiveWarehouseCode: header.warehouseCode,
    // Totals & submission
    totals,
    summaryCurrencyLabel: productsHook.productRows[0]?.currency || "FJD",
    createError,
    createDisabledReason: missingMandatoryFields.length > 0 ? missingMandatoryFields[0] : null,
    createArCreditMemoMutation,
    updateArCreditMemoMutation,
    isPending: createArCreditMemoMutation.isPending || updateArCreditMemoMutation.isPending,
    missingMandatoryFields,
    requiredCompletionPercent,
    handleCreateOrder,
    missingSearchMandatoryFields,
    searchRequiredCompletionPercent: header.vendorCode ? 100 : 0,
    searchMandatoryFields: ["vendorCode"] as const,
    warehouses: warehousesQuery.data ?? ([] as CreateLookupOption[]),
    warehousesLoading: warehousesQuery.isLoading,
    isLoading: vendorsQuery.isLoading || warehousesQuery.isLoading || salesEmployeesQuery.isLoading,
    isSourceClosed,
    reopenInvoiceMutation,
  };
}
