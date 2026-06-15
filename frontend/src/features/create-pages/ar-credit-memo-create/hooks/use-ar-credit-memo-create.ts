import { useQuery, useQueryClient } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useCreateArCreditMemoMutation,
  useUpdateArCreditMemoMutation,
} from "@/features/create-pages/ar-credit-memo-create/api/ar-credit-memo-create.mutations";
import { useArCnProducts } from "@/features/create-pages/ar-credit-memo-create/hooks/use-ar-cm-products";
import {
  AR_CREDIT_MEMO_MANDATORY_FIELDS,
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  MANDATORY_ERROR_TEXT,
} from "@/features/create-pages/ar-credit-memo-create/utils/ar-credit-memo-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/ar-credit-memo-create/utils/ar-credit-memo-create.utils";
import { resolveDocumentLineDiscount } from "@/features/create-pages/create-shared/utils/resolve-document-line-discount";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { calculateOrderTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import { formatWarehouseDisplay } from "@/features/create-pages/create-shared/utils/create-order.utils";
import type {
  CreateLookupOption,
  PopupMode,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { documentActionToast } from "@/features/create-pages/create-shared/utils/document-action-toast";
import { useDocumentSaveActions } from "@/features/create-pages/create-shared/hooks/use-document-save-actions";
import { pageLoadingToast } from "@/features/create-pages/create-shared/utils/page-loading-toast";
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
  const [formSnapshot, setFormSnapshot] = useState<any>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
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

  const resetWarehouse = useCallback(() => {
    setWarehouseInput("");
    setHeader({ warehouseCode: "" });
    setWarehouseFocused(false);
  }, [setHeader]);

  useEffect(() => {
    return () => {
      resetWarehouse();
    };
  }, [resetWarehouse]);

  const hydratedDocNumRef = useRef<string | null>(null);
  const loadingToastRef = useRef<ReturnType<typeof pageLoadingToast> | null>(null);

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

  const resolvedSalesEmployeeCode = useMemo(() => {
    const normalize = (val: unknown) =>
      String(val ?? "")
        .trim()
        .toLowerCase();
    const input = normalize(salesEmployeeInput);
    if (!input) return undefined;

    const byName = salesEmployees.find((item) => normalize(item.name) === input);
    if (byName) return Number(byName.code);

    const byCode = salesEmployees.find((item) => normalize(item.code) === input);
    if (byCode) return Number(byCode.code);

    return undefined;
  }, [salesEmployeeInput, salesEmployees]);

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
    const lookup = value.trim().toLowerCase();
    const match = lookup.match(/\[([^\]]+)\]$/) || lookup.match(/^\[([^\]]+)\]/);
    const codeOrName = match ? match[1]!.trim() : lookup;
    const matched = warehouses.find(
      (w) => w.name.toLowerCase() === codeOrName || w.code.toLowerCase() === codeOrName,
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

  const resetForm = useCallback(() => {
    setHeader({
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
    setNameInput("");
    setCodeInput("");
    setSalesEmployeeInput("");
    setWarehouseInput("");
    setNameFocused(false);
    setCodeFocused(false);
    setSalesEmployeeFocused(false);
    setWarehouseFocused(false);
    setModalOpen(false);
    setModalMode("vendor-name");
    setModalSearch("");
    setProductPopupOpen(false);
    setProductSearch("");
    setStockPreviewProduct(null);
    setCreateError(null);
    setSubmitAttempted(false);
    hydratedDocNumRef.current = null;
    setFormSnapshot(null);
    productsHook.setProductRows([]);
  }, [setHeader, productsHook]);

  const saveActions = useDocumentSaveActions({
    documentName: "AR Credit Memo",
    moduleType: "sales",
    defaultUrl: "/sales/ar-credit-memo/create",
    resetForm,
    getPayloadString: () => {
      const selectedRows = productsHook.productRows.filter((r) => r.selected);
      const payload = isEditMode
        ? {
            Comments: header.comments || undefined,
            DocDueDate: header.docDueDate || undefined,
            NumAtCard: header.referenceNo || undefined,
            SalesPersonCode: resolvedSalesEmployeeCode,
          }
        : {
            CardCode: header.vendorCode,
            Comments: header.comments,
            DocDate: header.docDate,
            DocDueDate: header.docDueDate,
            DocumentLines: selectedRows.map((row) => ({
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
            })),
            NumAtCard: header.referenceNo,
            SalesPersonCode: resolvedSalesEmployeeCode,
          };
      return JSON.stringify(payload);
    },
    isEditMode,
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
    hydratedDocNumRef.current = cleanDocNum;

    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast("A/R Credit Memo", isEditMode ? "edit" : "create");
    }

    void (async () => {
      try {
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
            detailLines
              .map((l: Record<string, unknown>) => String(l.ItemCode ?? ""))
              .filter(Boolean),
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
            ? Number(
                warehouseStocks.find((s) => String(s.code).trim() === lineWarehouse)?.stock ?? 0,
              )
            : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);

          const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
          const quantity = Number(line.Quantity ?? 0);
          const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
            line: line as Record<string, unknown>,
            grossAmount: price * quantity,
            headerDiscountPercent: Number((detail as Record<string, unknown>).DiscountPercent ?? 0),
          });

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
            discountAmount,
            discountPercent,
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
              line.VatPrcnt !== undefined
                ? Number(line.VatPrcnt)
                : Number(productMeta?.taxRate ?? 0),
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
        const loadedDocDate =
          isEditMode && detail.DocDate
            ? String(detail.DocDate).slice(0, 10)
            : new Date().toISOString().split("T")[0]!;
        const docDueDate =
          isEditMode && detail.DocDueDate
            ? String(detail.DocDueDate).slice(0, 10)
            : new Date().toISOString().split("T")[0]!;

        setHeader({
          billToAddress: String(billToAddress),
          comments: isEditMode
            ? String(comments)
            : `Based on AR Invoice ${cleanDocNum}. ${String(comments)}`,
          docDate: loadedDocDate,
          docDueDate: docDueDate,
          referenceNo: String(referenceNo),
          shipToAddress: String(shipToAddress),
          vendorCode: String(vendorCode),
          vendorName: String(vendorName),
          warehouseCode: String(warehouseCode),
        });
        productsHook.setProductRows(mappedRows);
        setFormSnapshot({
          comments: String(comments).trim(),
          referenceNo: String(referenceNo).trim(),
          docDueDate: docDueDate,
        });
        hydratedDocNumRef.current = cleanDocNum;
      } finally {
        loadingToastRef.current?.dismiss();
        loadingToastRef.current = null;
      }
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
  const isDirty = useMemo(() => {
    if (!isEditMode || !formSnapshot) {
      return false;
    }
    const current = {
      comments: (header.comments || "").trim(),
      referenceNo: (header.referenceNo || "").trim(),
      docDueDate: header.docDueDate,
    };
    return JSON.stringify(current) !== JSON.stringify(formSnapshot);
  }, [isEditMode, formSnapshot, header.comments, header.referenceNo, header.docDueDate]);

  const submitDisabled = isEditMode ? !isDirty : false;

  // Totals — only compute from selected (checked) rows
  const selectedRows = useMemo(
    () => productsHook.productRows.filter((r) => r.selected),
    [productsHook.productRows],
  );
  const totals = useMemo(() => calculateOrderTotals(selectedRows), [selectedRows]);

  const createMandatoryValues = useMemo(
    () => ({
      vendorCode: codeInput.trim() || header.vendorCode.trim(),
      vendorName: nameInput.trim() || header.vendorName.trim(),
    }),
    [codeInput, nameInput, header.vendorCode, header.vendorName],
  );

  const missingMandatoryFields = useMemo(() => {
    const missing: string[] = [];
    if (!createMandatoryValues.vendorCode) {
      missing.push("vendorCode");
    }
    if (!createMandatoryValues.vendorName) {
      missing.push("vendorName");
    }
    return missing;
  }, [createMandatoryValues]);

  const requiredCompletionPercent = useMemo(() => {
    const completed = AR_CREDIT_MEMO_MANDATORY_FIELDS.length - missingMandatoryFields.length;
    return Math.round((completed / AR_CREDIT_MEMO_MANDATORY_FIELDS.length) * 100);
  }, [missingMandatoryFields]);

  const createDisabledReason = useMemo(() => {
    if (missingMandatoryFields.length > 0) {
      const fieldKey = missingMandatoryFields[0];
      return (
        MANDATORY_ERROR_TEXT[fieldKey as keyof typeof MANDATORY_ERROR_TEXT] ||
        "Please fill all required fields."
      );
    }
    if (!header.docDueDate) {
      return MANDATORY_ERROR_TEXT.docDueDate;
    }
    if (productsHook.productRows.length === 0) {
      return "At least one product is required.";
    }
    if (selectedRows.length === 0) {
      return "Select at least one product to return.";
    }
    return null;
  }, [
    missingMandatoryFields,
    header.docDueDate,
    productsHook.productRows.length,
    selectedRows.length,
  ]);

  const handleCreateOrder = async (
    action: "save-new" | "view" | "close" | "draft" = "save-new",
    attachmentEntry?: number,
  ) => {
    if (action === "draft") {
      await saveActions.handleActionSuccess("draft");
      setSubmitAttempted(false);
      return;
    }

    setSubmitAttempted(true);
    if (createDisabledReason) {
      setCreateError(createDisabledReason);
      return;
    }

    if (isEditMode) {
      if (!isDirty) {
        const noChangeMessage = "Change at least one field before update.";
        setCreateError(noChangeMessage);
        goeyToast.error(noChangeMessage, { id: "no-change-update-toast" });
        return;
      }

      const detail = ((editDetailQuery.data as Record<string, unknown>)?.data ??
        editDetailQuery.data) as Record<string, unknown>;
      const currentComments = String(header.comments ?? "").trim();
      const currentReferenceNo = String(header.referenceNo ?? "").trim();
      const currentSalesPersonCode = resolvedSalesEmployeeCode;

      const payload = {
        Comments: currentComments || undefined,
        DocDueDate: header.docDueDate || undefined,
        NumAtCard: currentReferenceNo || undefined,
        SalesPersonCode: currentSalesPersonCode,
      };

      saveActions.actionToast.startLoading("AR Credit Memo", "update");
      try {
        const docEntry = detail?.DocEntry ?? detail?.id;
        await updateArCreditMemoMutation.mutateAsync({
          id: docEntry as string | number,
          payload,
        });
        const createdDocNum = detail?.DocNum as string | number | undefined;
        hydratedDocNumRef.current = null;
        setFormSnapshot(null);
        await saveActions.handleActionSuccess("update", createdDocNum);
      } catch (_error) {
        const errorMessage = (_error as Error).message || "Failed to update AR Credit Memo";
        saveActions.actionToast.showError("AR Credit Memo", "update", errorMessage);
        setCreateError(errorMessage);
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
      Address: header.billToAddress || undefined,
      Address2: header.shipToAddress || undefined,
      AttachmentEntry: attachmentEntry,
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
      SalesPersonCode: resolvedSalesEmployeeCode,
    };

    saveActions.actionToast.startLoading("AR Credit Memo", action);
    try {
      const result = await createArCreditMemoMutation.mutateAsync(payload);
      // Invalidate AR Invoice cache so that remaining quantities are updated immediately
      void queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      const createdDocNum = (result as { data?: { DocNum?: number | string } })?.data?.DocNum;
      await saveActions.handleActionSuccess(action, createdDocNum);
    } catch (_error) {
      const errorMessage = (_error as Error).message || "Failed to create AR Credit Memo";
      saveActions.actionToast.showError("AR Credit Memo", action, errorMessage);
      setCreateError(errorMessage);
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
    resetWarehouse,
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
    submitAttempted,
    submitDisabled,
    createDisabledReason,
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
    trackerDocType: (isEditMode ? "ar-credit-memo" : "ar-invoice") as
      | "ar-credit-memo"
      | "ar-invoice",
    trackerDocEntry: isEditMode
      ? Number(
          ((editDetailQuery.data as Record<string, unknown>)?.data as Record<string, unknown>)
            ?.id ?? (editDetailQuery.data as Record<string, unknown>)?.id,
        )
      : Number(sourceInvoiceData?.DocEntry ?? sourceInvoiceData?.id),
    isSaved: saveActions.isSaved,
    savedDocNum: saveActions.savedDocNum,
    resetForm: saveActions.handleReset,
  };
}
