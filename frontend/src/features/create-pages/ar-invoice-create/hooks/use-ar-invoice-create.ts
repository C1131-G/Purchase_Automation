import { useQuery, useQueryClient } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useCreateARInvoice,
  useUpdateARInvoice,
} from "@/features/create-pages/ar-invoice-create/api/ar-invoice-create.mutations";
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  FULL_PRODUCT_LIMIT,
  MANDATORY_ERROR_TEXT,
  REQUIRED_FIELD_LABEL_TEXT,
} from "@/features/create-pages/ar-invoice-create/utils/ar-invoice-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/ar-invoice-create/utils/ar-invoice-create.utils";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type {
  LookupItem,
  ProductLookupItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import {
  AR_INVOICE_MANDATORY_FIELDS,
  getMissingMandatoryCreateFieldsTyped,
} from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type {
  ActiveDatePicker,
  PopupMode,
  ProductRow,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { normalizeCreateOrderErrorMessage } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { documentActionToast } from "@/features/create-pages/create-shared/utils/document-action-toast";
import {
  getLookupInlineSearchByMode,
  syncLookupSearchByMode,
} from "@/features/create-pages/create-shared/utils/lookup-search-sync";
import {
  arInvoiceKeys,
  arInvoiceQueries,
} from "@/features/table-pages/ar-invoices/api/ar-invoice.queries";
import type { ARInvoiceDetailLine } from "@/features/table-pages/ar-invoices/api/ar-invoice.service";
import { salesOrderQueries } from "@/features/table-pages/sales-orders/api/sales-order.queries";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import {
  useARInvoiceHeader,
  useResetARInvoiceCreateAction,
  useSetARInvoiceHeaderAction,
} from "@/store/create/ar-invoice-create.store";
import type { ARInvoiceHeaderState } from "@/store/create/ar-invoice-create.store";

import { useArLookups } from "./use-ar-lookups";
import { useArModals } from "./use-ar-modals";
import { useArProducts } from "./use-ar-products";

type ARInvoiceCreateMode = "create" | "edit";

interface UseARInvoiceCreateOptions {
  mode?: ARInvoiceCreateMode;
  docNum?: string;
  sourceDocNum?: string | undefined;
  sourceDocType?: "SalesQuotation" | "SalesOrder" | undefined;
}

export function useARInvoiceCreate(options?: UseARInvoiceCreateOptions) {
  const normalizeCodeForCompare = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return "";
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase();
  };

  const mode = options?.mode ?? "create";
  const isEditMode = mode === "edit";
  const queryClient = useQueryClient();
  const header = useARInvoiceHeader();
  const resetARInvoiceCreate = useResetARInvoiceCreateAction();
  const setHeader = useSetARInvoiceHeaderAction();
  const createARInvoiceMutation = useCreateARInvoice();
  const updateARInvoiceMutation = useUpdateARInvoice();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null);
  const [productSearchFieldErrors, setProductSearchFieldErrors] = useState<ProductSearchFieldError>(
    EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [pullFromSOModalOpen, setPullFromSOModalOpen] = useState(false);
  const [pullFromSQModalOpen, setPullFromSQModalOpen] = useState(false);
  const hydratedDocNumRef = useRef<string | null>(null);
  const [hydratedDocNum, setHydratedDocNum] = useState<string | null>(null);
  const lastRestrictedToastAtRef = useRef(0);
  const editDocNum = (options?.docNum ?? "").trim();

  const docDateContainerRef = useRef<HTMLDivElement>(null);
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null);

  const modals = useArModals();

  const notifyRestricted = (fieldName: string) => {
    const now = Date.now();
    if (now - lastRestrictedToastAtRef.current < 2500) {
      return;
    }
    lastRestrictedToastAtRef.current = now;
    goeyToast.error(`${fieldName} is locked for edit`, {
      id: "restricted-edit-toast",
    });
  };

  const clearFieldError = (field: keyof ProductSearchFieldError) => {
    setProductSearchFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const lookups = useArLookups({
    clearFieldError,
    closeModal: () => modals.setModalOpen(false),
    headerWarehouseCode: header.warehouseCode ?? "",
    setHeader,
  });

  const productsHook = useArProducts({
    customerLookupToken: `${lookups.codeInput.trim().toLowerCase()}::${lookups.nameInput.trim().toLowerCase()}`,
    customerSelected: Boolean(lookups.codeInput || lookups.nameInput),
    effectiveWarehouseCode: lookups.effectiveWarehouseCode,
    productPopupOpen: modals.productPopupOpen,
    productSearch: modals.productSearch,
    setProductPopupOpen: modals.setProductPopupOpen,
    setProductSearch: modals.setProductSearch,
    stockPreviewProductCode: modals.stockPreviewProduct?.code,
  });

  useEffect(() => {
    if (isEditMode) {
      return;
    }
    resetARInvoiceCreate();
    hydratedDocNumRef.current = null;
  }, [isEditMode, resetARInvoiceCreate]);

  const editDetailQuery = useQuery({
    ...arInvoiceQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  });

  const sourceDetailQuerySQ = useQuery({
    ...salesQuotationQueries.detailByDocNum(options?.sourceDocNum ?? ""),
    enabled:
      mode === "create" &&
      options?.sourceDocType === "SalesQuotation" &&
      Boolean(options?.sourceDocNum),
  });

  const sourceDetailQuerySO = useQuery({
    ...salesOrderQueries.detailByDocNum(options?.sourceDocNum ?? ""),
    enabled:
      mode === "create" &&
      options?.sourceDocType === "SalesOrder" &&
      Boolean(options?.sourceDocNum),
  });

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    const currentDocNum = editDocNum;
    if (!currentDocNum || hydratedDocNumRef.current === currentDocNum) {
      return;
    }
    const detail = editDetailQuery.data?.data;
    if (!detail) {
      return;
    }

    const customerCode = String(detail.CardCode ?? "").trim();
    const customerName = String(detail.CardName ?? "").trim();
    const matchedCustomer = lookups.vendors.find((item) => String(item.code) === customerCode);
    const salesEmployeeNameFromDocCode =
      detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
        ? lookups.salesEmployees.find(
            (item: LookupItem) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(detail.SalesPersonCode),
          )?.name
        : "";
    const associatedSalesEmployeeName =
      salesEmployeeNameFromDocCode ||
      (matchedCustomer?.salesEmployeeCode !== undefined
        ? lookups.salesEmployees.find(
            (item: LookupItem) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(matchedCustomer.salesEmployeeCode),
          )?.name
        : "") ||
      matchedCustomer?.salesEmployeeName?.trim() ||
      "";
    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? "").trim();
    const matchedWarehouse = lookups.warehouses.find((item) => String(item.code) === warehouseCode);
    const rawComments = String(detail.Comments ?? "").trim();
    const referenceNo = String(detail.NumAtCard ?? "").trim();
    const comments = rawComments;
    const docDate = String(detail.DocDate ?? "").slice(0, 10);
    const docDueDate = String(detail.DocDueDate ?? "").slice(0, 10);
    const address = String(detail.Address ?? "").trim();

    void (async () => {
      const detailLines = detail.DocumentLines ?? [];
      const productsForWarehouse = (
        warehouseCode.trim().length > 0
          ? await queryClient
              .fetchQuery(
                createSharedQueries.products(warehouseCode, undefined, FULL_PRODUCT_LIMIT),
              )
              .catch(() => [])
          : []
      ) as ProductLookupItem[];

      const productByCode = new Map<string, ProductLookupItem>(
        productsForWarehouse.map((item) => [String(item.code).trim(), item]),
      );
      const stocksByItemCode = new Map<string, { code: string; stock: number }[]>();
      const uniqueItemCodes = [
        ...new Set(detailLines.map((line) => String(line.ItemCode ?? "").trim())),
      ].filter(Boolean);

      await Promise.all(
        uniqueItemCodes.map(async (itemCode) => {
          const warehouseStocks = (await queryClient
            .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
            .catch(() => [])) as { code: string; stock: number }[];
          stocksByItemCode.set(itemCode, warehouseStocks);
        }),
      );

      const mappedRows = detailLines.map((line: ARInvoiceDetailLine, index) => {
        const itemCode = String(line.ItemCode ?? "").trim();
        const productMeta = productByCode.get(itemCode);
        const lineWarehouse = String(line.WarehouseCode ?? "").trim();
        const warehouseStocks = stocksByItemCode.get(itemCode) ?? [];
        // Use line-specific stock lookup
        const lineStock = lineWarehouse
          ? Number(warehouseStocks.find((s) => String(s.code).trim() === lineWarehouse)?.stock ?? 0)
          : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);

        const quantity = Number(line.Quantity ?? 1);
        const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
        const grossAmount = Math.max(0, price * quantity);
        const apiDiscountPercent = Number(line.DiscountPercent ?? Number.NaN);
        const headerDiscountPercent = Number((detail as any).DiscountPercent ?? 0);
        const lineTotal = Number(line.LineTotal ?? Number.NaN);
        const derivedDiscountAmountFromLineTotal =
          Number.isFinite(lineTotal) && grossAmount > 0
            ? Math.max(0, Math.min(grossAmount, grossAmount - lineTotal))
            : 0;
        let discountPercent = Number.isFinite(apiDiscountPercent)
          ? apiDiscountPercent
          : grossAmount > 0
            ? (derivedDiscountAmountFromLineTotal / grossAmount) * 100
            : 0;
        if (discountPercent === 0 && headerDiscountPercent > 0) {
          discountPercent = headerDiscountPercent;
        }
        const discountAmount = (grossAmount * discountPercent) / 100;
        const resolvedUomEntry =
          typeof line.UoMEntry === "number" && Number.isFinite(line.UoMEntry)
            ? line.UoMEntry
            : productMeta?.uomEntry;
        return {
          id: `row-${currentDocNum}-${index}`,
          productCode: itemCode,
          productName: String(line.ItemDescription ?? productMeta?.name ?? "").trim(),
          stock: lineStock,
          price,
          currency: String(detail.DocCurr ?? productMeta?.currency ?? ""),
          vatGroup: String(line.VatGroup ?? line.TaxCode ?? productMeta?.vatGroup ?? "").trim(),
          taxRate:
            (line as Record<string, unknown>).VatPrcnt !== undefined &&
            (line as Record<string, unknown>).VatPrcnt !== null
              ? Number((line as Record<string, unknown>).VatPrcnt)
              : Number(productMeta?.taxRate ?? 0),
          uomCode: String(line.UoMCode ?? productMeta?.uomCode ?? "").trim(),
          ...(resolvedUomEntry !== undefined ? { uomEntry: resolvedUomEntry } : {}),
          quantity,
          discountPercent,
          discountAmount,
          comment: "",
          baseEntry:
            typeof line.BaseEntry === "number" && Number.isFinite(line.BaseEntry)
              ? line.BaseEntry
              : undefined,
          baseLine:
            typeof line.BaseLine === "number" && Number.isFinite(line.BaseLine)
              ? line.BaseLine
              : undefined,
          baseType:
            typeof line.BaseType === "number" && Number.isFinite(line.BaseType)
              ? line.BaseType
              : undefined,
          warehouseCode: lineWarehouse,
          selected: false,
        };
      });

      setHeader({
        comments,
        docDate: docDate || header.docDate,
        docDueDate,
        referenceNo,
        vendorCode: customerCode,
        vendorName: customerName,
        warehouseCode,
      });
      lookups.setNameInput(customerName);
      lookups.setCodeInput(customerCode);
      lookups.setWarehouseInput(matchedWarehouse?.name ?? warehouseCode);
      lookups.setSalesEmployeeInput(associatedSalesEmployeeName);
      lookups.setBillToAddress(address);
      lookups.setShipToAddress(address);
      productsHook.setProductRows(mappedRows);
      productsHook.setProductRowDrafts({});

      hydratedDocNumRef.current = currentDocNum;
      setHydratedDocNum(currentDocNum);
    })();
  }, [
    editDetailQuery.data,
    header.docDate,
    isEditMode,
    lookups,
    editDocNum,
    productsHook,
    queryClient,
    setHeader,
  ]);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }
    const currentSourceDocNum = options?.sourceDocNum;
    const currentSourceDocType = options?.sourceDocType;
    if (!currentSourceDocNum || !currentSourceDocType) {
      return;
    }

    const detail =
      currentSourceDocType === "SalesQuotation"
        ? sourceDetailQuerySQ.data?.data
        : sourceDetailQuerySO.data?.data;

    if (!detail) {
      return;
    }
    if (hydratedDocNumRef.current === `${currentSourceDocType}-${currentSourceDocNum}`) {
      return;
    }

    const customerCode = String(detail.CardCode ?? "").trim();
    const customerName = String(detail.CardName ?? "").trim();
    const matchedCustomer = lookups.vendors.find((item) => String(item.code) === customerCode);
    const salesEmployeeNameFromDocCode =
      detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
        ? lookups.salesEmployees.find(
            (item: LookupItem) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(detail.SalesPersonCode),
          )?.name
        : "";
    const associatedSalesEmployeeName =
      salesEmployeeNameFromDocCode ||
      (matchedCustomer?.salesEmployeeCode !== undefined
        ? lookups.salesEmployees.find(
            (item: LookupItem) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(matchedCustomer.salesEmployeeCode),
          )?.name
        : "") ||
      matchedCustomer?.salesEmployeeName?.trim() ||
      "";
    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? "").trim();
    const matchedWarehouse = lookups.warehouses.find((item) => String(item.code) === warehouseCode);

    // Preserve original doc comments as-is, and pick up referenceNo from NumAtCard
    const rawComments = String(detail.Comments ?? "").trim();

    const referenceNo = String((detail as { NumAtCard?: string }).NumAtCard ?? "");
    const comments = rawComments || `Based on ${currentSourceDocType} ${currentSourceDocNum}`;
    const docDueDate = String(detail.DocDueDate ?? "").slice(0, 10);
    const address = String(detail.Address ?? "").trim();

    void (async () => {
      const detailLines = detail.DocumentLines ?? [];
      const productsForWarehouse = (
        warehouseCode.trim().length > 0
          ? await queryClient
              .fetchQuery(
                createSharedQueries.products(warehouseCode, undefined, FULL_PRODUCT_LIMIT),
              )
              .catch(() => [])
          : []
      ) as ProductLookupItem[];

      const productByCode = new Map<string, ProductLookupItem>(
        productsForWarehouse.map((item) => [String(item.code).trim(), item]),
      );
      const stocksByItemCode = new Map<string, { code: string; stock: number }[]>();
      const uniqueItemCodes = [
        ...new Set(detailLines.map((line) => String(line.ItemCode ?? "").trim())),
      ].filter(Boolean);

      await Promise.all(
        uniqueItemCodes.map(async (itemCode) => {
          const warehouseStocks = (await queryClient
            .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
            .catch(() => [])) as { code: string; stock: number }[];
          stocksByItemCode.set(itemCode, warehouseStocks);
        }),
      );

      const baseType = currentSourceDocType === "SalesQuotation" ? 23 : 17;

      const mappedRows = detailLines.map((line, index: number) => {
        const itemCode = String(line.ItemCode ?? "").trim();
        const productMeta = productByCode.get(itemCode);
        const lineWarehouse = String(line.WarehouseCode ?? "").trim();

        // Per-line stock derivation
        const warehouseStocks = stocksByItemCode.get(itemCode) ?? [];
        const lineStock = lineWarehouse
          ? Number(warehouseStocks.find((s) => String(s.code).trim() === lineWarehouse)?.stock ?? 0)
          : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);
        const quantity = Number(line.RemainingOpenQuantity ?? line.Quantity ?? 1);
        const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
        const grossAmount = Math.max(0, price * quantity);
        const apiDiscountPercent = Number(line.DiscountPercent ?? Number.NaN);
        const headerDiscountPercent = Number((detail as any).DiscountPercent ?? 0);
        const lineTotal = Number(line.LineTotal ?? Number.NaN);
        const derivedDiscountAmountFromLineTotal =
          Number.isFinite(lineTotal) && grossAmount > 0
            ? Math.max(0, Math.min(grossAmount, grossAmount - lineTotal))
            : 0;
        let discountPercent = Number.isFinite(apiDiscountPercent)
          ? apiDiscountPercent
          : grossAmount > 0
            ? (derivedDiscountAmountFromLineTotal / grossAmount) * 100
            : 0;
        if (discountPercent === 0 && headerDiscountPercent > 0) {
          discountPercent = headerDiscountPercent;
        }
        const discountAmount = (grossAmount * discountPercent) / 100;
        const resolvedUomEntry =
          typeof line.UoMEntry === "number" && Number.isFinite(line.UoMEntry)
            ? line.UoMEntry
            : productMeta?.uomEntry;
        return {
          id: `row-copy-${currentSourceDocNum}-${index}`,
          productCode: itemCode,
          productName: String(line.ItemDescription ?? productMeta?.name ?? "").trim(),
          stock: lineStock,
          price,
          currency: String(detail.DocCurr ?? productMeta?.currency ?? ""),
          vatGroup: String(line.TaxCode ?? line.VatGroup ?? productMeta?.vatGroup ?? "").trim(),
          taxRate:
            (line as Record<string, unknown>).VatPrcnt !== undefined &&
            (line as Record<string, unknown>).VatPrcnt !== null
              ? Number((line as Record<string, unknown>).VatPrcnt)
              : Number(productMeta?.taxRate ?? 0),
          uomCode: String(line.UoMCode ?? productMeta?.uomCode ?? "").trim(),
          ...(resolvedUomEntry !== undefined ? { uomEntry: resolvedUomEntry } : {}),
          quantity,
          discountPercent,
          discountAmount,
          comment: "",
          baseEntry: detail.DocEntry ?? detail.id,
          baseLine: line.LineNum ?? index,
          baseType,
          warehouseCode: lineWarehouse,
          selected: false,
        };
      });

      setHeader({
        comments,
        docDueDate,
        referenceNo,
        vendorCode: customerCode,
        vendorName: customerName,
        warehouseCode,
      });
      lookups.setNameInput(customerName);
      lookups.setCodeInput(customerCode);
      lookups.setWarehouseInput(matchedWarehouse?.name ?? warehouseCode);
      lookups.setSalesEmployeeInput(associatedSalesEmployeeName);
      lookups.setBillToAddress(address);
      lookups.setShipToAddress(address);
      productsHook.setProductRows(mappedRows);
      productsHook.setProductRowDrafts({});

      hydratedDocNumRef.current = `${currentSourceDocType}-${currentSourceDocNum}`;
    })();
  }, [
    sourceDetailQuerySQ.data,
    sourceDetailQuerySO.data,
    mode,
    options?.sourceDocNum,
    options?.sourceDocType,
    lookups,
    productsHook,
    queryClient,
    setHeader,
  ]);

  const popupResults = useMemo(() => {
    const term = modals.modalSearch.trim().toLowerCase();
    const source = (
      modals.modalMode === "vendor-name" || modals.modalMode === "vendor-code"
        ? lookups.vendors
        : modals.modalMode === "warehouse"
          ? lookups.warehouses
          : lookups.salesEmployees
    ) as ProductLookupItem[];
    if (!term) {
      return source;
    }
    const score = (item: ProductLookupItem) => {
      const code = (item.code || "").toLowerCase();
      const name = (item.name || "").toLowerCase();
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
    return [...source].toSorted((a, b) => {
      const byScore = score(a) - score(b);
      if (byScore !== 0) {
        return byScore;
      }
      return a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [
    lookups.vendors,
    lookups.warehouses,
    lookups.salesEmployees,
    modals.modalSearch,
    modals.modalMode,
  ]);

  const openPopupWithContext = (mode: PopupMode) => {
    modals.openPopup(mode, {
      codeInput: lookups.codeInput,
      nameInput: lookups.nameInput,
      salesEmployeeInput: lookups.salesEmployeeInput,
      warehouseInput: lookups.warehouseInput,
    });
  };

  useEffect(() => {
    if (!modals.modalOpen) {
      return;
    }
    const nextSearch = getLookupInlineSearchByMode(modals.modalMode, {
      salesEmployee: lookups.salesEmployeeInput,
      vendorCode: lookups.codeInput,
      vendorName: lookups.nameInput,
      warehouse: lookups.warehouseInput,
    });
    if (nextSearch !== modals.modalSearch) {
      modals.setModalSearch(nextSearch);
    }
  }, [
    lookups.codeInput,
    lookups.nameInput,
    lookups.salesEmployeeInput,
    lookups.warehouseInput,
    modals,
  ]);

  const handleLookupModalSearchSync = (mode: PopupMode, value: string) =>
    syncLookupSearchByMode(mode, value, {
      onSalesEmployee: lookups.handleSalesEmployeeChange,
      onVendorCode: lookups.handleVendorCodeChange,
      onVendorName: lookups.handleVendorNameChange,
      onWarehouse: lookups.handleWarehouseChange,
    });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!activeDatePicker) {
        return;
      }
      const target = event.target as Node;
      const insideDoc = docDateContainerRef.current?.contains(target);
      const insideDelivery = deliveryDateContainerRef.current?.contains(target);
      if (!insideDoc && !insideDelivery) {
        setActiveDatePicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDatePicker]);

  const handleOpenProductPopup = (rowId: string | null = null) => {
    const existingRow = rowId ? productsHook.productRows.find((r) => r.id === rowId) : null;
    const initialSearch = existingRow ? existingRow.productName : "";

    productsHook.openProductPopup(rowId, initialSearch, {
      onValidateBeforeOpen: () => {
        const nextErrors: ProductSearchFieldError = {
          ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
        };
        if (!lookups.nameInput.trim()) {
          nextErrors.vendorName = "Customer Name is required.";
        }
        if (!lookups.codeInput.trim()) {
          nextErrors.vendorCode = "Customer Code is required.";
        }
        return nextErrors;
      },
      onValidationFailed: (errors) => setProductSearchFieldErrors(errors),
    });
  };

  const createMandatoryValues = useMemo(
    () => ({
      billToAddress: lookups.billToAddress.trim(),
      comments: header.comments.trim(),
      docDueDate: header.docDueDate,
      referenceNo: header.referenceNo.trim(),
      salesEmployee: lookups.salesEmployeeInput.trim(),
      shipToAddress: lookups.shipToAddress.trim(),
      vendorCode: lookups.codeInput.trim() || header.vendorCode.trim(),
      vendorName: lookups.nameInput.trim() || header.vendorName.trim(),
      warehouseCode: lookups.effectiveWarehouseCode,
    }),
    [
      lookups.codeInput,
      header.vendorCode,
      lookups.nameInput,
      header.vendorName,
      header.docDueDate,
      lookups.effectiveWarehouseCode,
      lookups.salesEmployeeInput,
      lookups.billToAddress,
      lookups.shipToAddress,
      header.referenceNo,
      header.comments,
    ],
  );

  const missingMandatoryFields = useMemo(
    () => getMissingMandatoryCreateFieldsTyped(createMandatoryValues, AR_INVOICE_MANDATORY_FIELDS),
    [createMandatoryValues],
  );

  const searchMandatoryFields = useMemo(() => ["vendorName", "vendorCode"] as const, []);

  const missingSearchMandatoryFields = useMemo(
    () =>
      searchMandatoryFields.filter((field) => !String(createMandatoryValues[field] ?? "").trim()),
    [createMandatoryValues, searchMandatoryFields],
  );

  const resolvedSalesEmployeeCode = useMemo(() => {
    const byName = lookups.salesEmployees.find(
      (item) => item.name.trim().toLowerCase() === lookups.salesEmployeeInput.trim().toLowerCase(),
    );
    if (byName) {
      return Number(normalizeCodeForCompare(byName.code));
    }

    const byCode = lookups.salesEmployees.find(
      (item) =>
        normalizeCodeForCompare(item.code) === normalizeCodeForCompare(lookups.salesEmployeeInput),
    );
    if (byCode) {
      return Number(normalizeCodeForCompare(byCode.code));
    }

    return;
  }, [lookups.salesEmployeeInput, lookups.salesEmployees]);

  const searchRequiredCompletionPercent =
    ((searchMandatoryFields.length - missingSearchMandatoryFields.length) /
      searchMandatoryFields.length) *
    100;

  const hasValidRowsForCreate = productsHook.productRows.some(
    (row) => row.productCode.trim() && row.quantity > 0,
  );
  const hasRowsWithoutWarehouse = false;

  const createDisabledReason =
    missingMandatoryFields.length > 0
      ? `Complete required fields: ${missingMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field as keyof typeof REQUIRED_FIELD_LABEL_TEXT]).join(", ")}.`
      : !hasValidRowsForCreate
        ? `Add at least one product row before ${isEditMode ? "updating" : "creating"} A/R invoice.`
        : null;

  const requiredCompletionPercent =
    ((AR_INVOICE_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      AR_INVOICE_MANDATORY_FIELDS.length) *
    100;

  const requiredFieldsErrorText = `Fill required fields before ${isEditMode ? "updating" : "creating"} A/R invoice.`;
  const rowsErrorText = `Add at least one product row before ${isEditMode ? "updating" : "creating"} A/R invoice.`;
  const warehouseErrorText = "Warehouse must be selected for all product rows.";

  const visibleCreateError =
    createError === requiredFieldsErrorText && !createDisabledReason
      ? null
      : createError === rowsErrorText && hasValidRowsForCreate
        ? null
        : createError === warehouseErrorText && !hasRowsWithoutWarehouse
          ? null
          : createError;

  function handleCreateOrderAction() {
    void handleCreateOrder();
  }

  const handleCreateOrder = async () => {
    const nextErrors: ProductSearchFieldError = {
      ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
    };
    missingMandatoryFields.forEach((field) => {
      const mandatoryKey = field as keyof typeof MANDATORY_ERROR_TEXT;
      nextErrors[field as keyof ProductSearchFieldError] = MANDATORY_ERROR_TEXT[mandatoryKey];
    });

    if (Object.values(nextErrors).some(Boolean)) {
      setProductSearchFieldErrors(nextErrors);
      setCreateError(requiredFieldsErrorText);
      return;
    }

    const validRows = productsHook.productRows.filter(
      (row) => row.productCode.trim() && row.quantity > 0,
    );
    if (validRows.length === 0) {
      setCreateError(rowsErrorText);
      return;
    }

    if (isEditMode) {
      const detail = editDetailQuery.data?.data;
      const existingDocDueDate = String(detail?.DocDueDate ?? "")
        .slice(0, 10)
        .trim();
      const rawComments = String(detail?.Comments ?? "").trim();
      const existingComments = rawComments;
      const existingReferenceNo = String(detail?.NumAtCard ?? "").trim();
      const currentDocDueDate = String(header.docDueDate ?? "").trim();
      const currentComments = String(header.comments ?? "").trim();
      const currentReferenceNo = String(header.referenceNo ?? "").trim();

      if (
        currentDocDueDate === existingDocDueDate &&
        currentComments === existingComments.trim() &&
        currentReferenceNo === existingReferenceNo
      ) {
        const noChangeMessage = "Change at least one field before update.";
        setCreateError(noChangeMessage);
        goeyToast.error(noChangeMessage, { id: "no-change-update-toast" });
        return;
      }
    }

    setCreateError(null);

    const payload = isEditMode
      ? {
          Comments: header.comments.trim() || undefined,
          DocDueDate: header.docDueDate || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
        }
      : {
          Address: lookups.billToAddress.trim() || lookups.shipToAddress.trim() || undefined,
          CardCode: (header.vendorCode || lookups.codeInput).trim(),
          Comments: header.comments.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          DocumentLines: validRows.map((row) => {
            const hasCompleteBaseLink =
              Number.isFinite(row.baseEntry) &&
              Number.isFinite(row.baseLine) &&
              Number.isFinite(row.baseType);

            return {
              LineNum: row.lineNum,
              DiscountPercent: row.discountPercent,
              ItemCode: row.productCode,
              Quantity: row.quantity,
              TaxCode: row.vatGroup || undefined,
              UnitPrice: row.price,
              UoMCode: row.uomCode || undefined,
              UoMEntry: row.uomEntry ?? undefined,
              WarehouseCode:
                row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
              ...(hasCompleteBaseLink
                ? {
                    BaseEntry: row.baseEntry,
                    BaseLine: row.baseLine,
                    BaseType: row.baseType,
                  }
                : {}),
            };
          }),
          NumAtCard: header.referenceNo.trim() || undefined,
          SalesPersonCode: resolvedSalesEmployeeCode,
        };

    const toastHandle = documentActionToast("A/R Invoice", isEditMode ? "update" : "create");
    try {
      let createdDocNum: string | number | undefined;
      if (isEditMode) {
        const detail = editDetailQuery.data?.data;
        const docEntry = detail?.DocEntry ?? detail?.id;
        if (docEntry === undefined || docEntry === null) {
          setCreateError("Unable to update A/R invoice. Document id is missing.");
          toastHandle.error();
          return;
        }
        await updateARInvoiceMutation.mutateAsync({ id: docEntry, payload });
        createdDocNum = detail?.DocNum;
      } else {
        const result = await createARInvoiceMutation.mutateAsync({ payload });
        createdDocNum = (result as { data?: { DocNum?: number } }).data?.DocNum;
      }
      toastHandle.success(createdDocNum);

      void queryClient.invalidateQueries({ queryKey: arInvoiceKeys.all });
      void Promise.allSettled([
        queryClient.prefetchQuery(arInvoiceQueries.list({ limit: 10, page: 1 })),
        queryClient.prefetchQuery(arInvoiceQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(arInvoiceQueries.docNumSuggestions(undefined, 100)),
      ]);

      if (isEditMode) {
        const currentDocNum = (options?.docNum ?? "").trim();
        if (currentDocNum) {
          void queryClient.prefetchQuery(arInvoiceQueries.detailByDocNum(currentDocNum));
        }
        return;
      }

      resetARInvoiceCreate();
      lookups.setNameInput("");
      lookups.setCodeInput("");
      lookups.setWarehouseInput("");
      lookups.setSalesEmployeeInput("");
      lookups.setBillToAddress("");
      lookups.setShipToAddress("");
      lookups.setNameFocused(false);
      lookups.setCodeFocused(false);
      lookups.setWarehouseFocused(false);
      lookups.setSalesEmployeeFocused(false);
      setActiveDatePicker(null);
      modals.setModalOpen(false);
      modals.setModalMode("vendor-name");
      modals.setModalSearch("");
      productsHook.setProductRows([]);
      productsHook.setProductRowDrafts({});
      setProductSearchFieldErrors(EMPTY_PRODUCT_SEARCH_FIELD_ERRORS);
      modals.setProductSearch("");
      productsHook.setDebouncedProductSearch("");
      productsHook.setActiveProductRowId(null);
      modals.setProductPopupOpen(false);
      modals.setStockPreviewProduct(null);
      setCreateError(null);
    } catch (error) {
      toastHandle.error();
      const errorMessage = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isEditMode ? "update" : "create"} A/R Invoice. Try again.`,
      );
      setCreateError(errorMessage);
    }
  };

  const submitARInvoiceMutation = isEditMode ? updateARInvoiceMutation : createARInvoiceMutation;

  const totals = useMemo(
    () => calculateOrderTotals(productsHook.productRows),
    [productsHook.productRows],
  );
  const summaryCurrency = useMemo(
    () => calculateSummaryCurrency(productsHook.productRows),
    [productsHook.productRows],
  );
  const summaryCurrencyLabel = summaryCurrency === "MULTI" ? "MULTI" : summaryCurrency;
  const isEditHydrated = !isEditMode || !editDocNum || hydratedDocNum === editDocNum;

  const addProductsFromSOs = async (
    selectedLines: {
      ItemCode: string;
      ItemDescription?: string;
      Quantity?: number;
      Price?: number;
      DocCurr?: string;
      TaxCode?: string;
      VatGroup?: string;
      VatPrcnt?: number;
      UoMCode?: string | number;
      UoMEntry?: number;
      WarehouseCode?: string;
      LineNum?: number;
      DocNum?: number;
      DocEntry?: number;
      OpenQty?: number;
      DiscountPercent?: number;
    }[],
  ) => {
    const uniqueItemCodes = [...new Set(selectedLines.map((l) => String(l.ItemCode).trim()))];
    const stocksByItemCode = new Map<string, { code: string; stock: number }[]>();

    await Promise.all(
      uniqueItemCodes.map(async (code) => {
        const stocks = await queryClient
          .fetchQuery(createSharedQueries.productWarehouseStocks(code))
          .catch(() => []);
        stocksByItemCode.set(code, stocks);
      }),
    );

    const newRows = selectedLines.map((line, index) => {
      const itemCode = String(line.ItemCode).trim();
      const lineWarehouse = String(line.WarehouseCode ?? "").trim();
      const warehouseStocks = stocksByItemCode.get(itemCode) ?? [];

      const lineStock = lineWarehouse
        ? Number(warehouseStocks.find((s) => String(s.code).trim() === lineWarehouse)?.stock ?? 0)
        : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);

      const price = Number(line.Price ?? 0);
      const openQty = Number(line.OpenQty ?? line.Quantity ?? 1);
      const discPct = Number(line.DiscountPercent ?? 0);

      return {
        baseEntry: line.DocEntry,
        baseLine: line.LineNum,
        baseType: 17, // Sales Order
        comment: `Based on SO ${line.DocNum}`,
        currency: line.DocCurr,
        discountAmount: (price * openQty * discPct) / 100,
        discountPercent: discPct,
        id: `so-pull-${line.DocNum}-${line.LineNum}-${Date.now()}-${index}`,
        price,
        productCode: itemCode,
        productName: line.ItemDescription,
        quantity: openQty,
        selected: false,
        stock: lineStock,
        taxRate: line.VatPrcnt || 0,
        uomCode: line.UoMCode,
        uomEntry: line.UoMEntry,
        vatGroup: line.TaxCode || line.VatGroup,
        warehouseCode: lineWarehouse,
      } as ProductRow;
    });

    productsHook.setProductRows((prev) => {
      const existing = prev.filter((r) => r.productCode.trim());
      return [...existing, ...newRows];
    });
    setPullFromSOModalOpen(false);
  };

  const addProductsFromSQs = async (
    selectedLines: {
      ItemCode: string;
      ItemDescription?: string;
      Quantity?: number;
      Price?: number;
      UnitPrice?: number;
      DocCurr?: string;
      TaxCode?: string;
      VatGroup?: string;
      VatPrcnt?: number;
      UoMCode?: string | number;
      UoMEntry?: number;
      WarehouseCode?: string;
      LineNum?: number;
      DocNum?: number;
      DocEntry?: number;
      OpenQty?: number;
      DiscountPercent?: number;
      LineTotal?: number;
    }[],
  ) => {
    const uniqueItemCodes = [...new Set(selectedLines.map((l) => String(l.ItemCode).trim()))];
    const stocksByItemCode = new Map<string, { code: string; stock: number }[]>();

    await Promise.all(
      uniqueItemCodes.map(async (code) => {
        const stocks = await queryClient
          .fetchQuery(createSharedQueries.productWarehouseStocks(code))
          .catch(() => []);
        stocksByItemCode.set(code, stocks);
      }),
    );

    const newRows = selectedLines.map((line, index) => {
      const itemCode = String(line.ItemCode).trim();
      const lineWarehouse = String(line.WarehouseCode ?? "").trim();
      const warehouseStocks = stocksByItemCode.get(itemCode) ?? [];

      const lineStock = lineWarehouse
        ? Number(warehouseStocks.find((s) => String(s.code).trim() === lineWarehouse)?.stock ?? 0)
        : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);

      const price = Number(line.Price ?? line.UnitPrice ?? 0);
      const openQty = Number(line.OpenQty ?? line.Quantity ?? 1);
      const grossAmount = Math.max(0, price * openQty);
      const apiDiscountPercent = Number(line.DiscountPercent ?? Number.NaN);
      // Fallback to undefined/NaN if LineTotal is missing since OpenSalesQuotationLine doesn't formally have it,
      // but if we added it to backend it will be present in the payload.
      const lineTotal = Number(line.LineTotal ?? Number.NaN);
      const derivedDiscountAmountFromLineTotal =
        Number.isFinite(lineTotal) && grossAmount > 0
          ? Math.max(0, Math.min(grossAmount, grossAmount - lineTotal))
          : 0;
      const discountPercent = Number.isFinite(apiDiscountPercent)
        ? apiDiscountPercent
        : grossAmount > 0
          ? (derivedDiscountAmountFromLineTotal / grossAmount) * 100
          : 0;
      const discountAmount = (grossAmount * discountPercent) / 100;

      return {
        baseEntry: line.DocEntry,
        baseLine: line.LineNum,
        baseType: 23, // Sales Quotation
        comment: `Based on SQ ${line.DocNum}`,
        currency: line.DocCurr,
        discountAmount,
        discountPercent,
        id: `sq-pull-${line.DocNum}-${line.LineNum}-${Date.now()}-${index}`,
        price,
        productCode: itemCode,
        productName: line.ItemDescription,
        quantity: openQty,
        selected: false,
        stock: lineStock,
        taxRate: line.VatPrcnt ?? 0,
        uomCode: line.UoMCode,
        uomEntry: line.UoMEntry,
        vatGroup: line.TaxCode ?? line.VatGroup,
        warehouseCode: lineWarehouse,
      } as ProductRow;
    });

    productsHook.setProductRows((prev) => {
      const existing = prev.filter((r) => r.productCode.trim());
      return [...existing, ...newRows];
    });
    setPullFromSQModalOpen(false);
  };

  return {
    ...lookups,
    ...modals,
    ...productsHook,
    activeDatePicker,
    addProductsFromSOs,
    addProductsFromSQs,
    applyProductToRow: (product: ProductLookupItem) =>
      isEditMode
        ? notifyRestricted("Products")
        : productsHook.applyProductToRow(product, {
            closeProductPopup: () => modals.setProductPopupOpen(false),
          }),
    applyProductsToRows: (products: ProductLookupItem[]) =>
      isEditMode
        ? notifyRestricted("Products")
        : productsHook.applyProductsToRows(products, {
            closeProductPopup: () => modals.setProductPopupOpen(false),
          }),
    codeFocused: lookups.codeFocused,
    codeSuggestions: lookups.codeSuggestions,
    createARInvoiceMutation: submitARInvoiceMutation,
    createDisabledReason,
    createError: visibleCreateError,
    deliveryDateContainerRef,
    docDateContainerRef,
    editDetailQuery,
    handleCreateOrder: handleCreateOrderAction,
    handleLookupModalSearchSync: (mode: PopupMode, val: string) =>
      isEditMode ? notifyRestricted("Lookup Search") : handleLookupModalSearchSync(mode, val),
    handleSalesEmployeeChange: (val: string) =>
      isEditMode ? notifyRestricted("Sales Employee") : lookups.handleSalesEmployeeChange(val),
    handleVendorCodeChange: (val: string) =>
      isEditMode ? notifyRestricted("Customer Code") : lookups.handleVendorCodeChange(val),
    handleVendorNameChange: (val: string) =>
      isEditMode ? notifyRestricted("Customer Name") : lookups.handleVendorNameChange(val),
    handleWarehouseChange: (val: string) =>
      isEditMode ? notifyRestricted("Warehouse") : lookups.handleWarehouseChange(val),
    header,
    isEditHydrated,
    isEditMode,
    missingMandatoryFields,
    missingSearchMandatoryFields,
    nameFocused: lookups.nameFocused,
    nameSuggestions: lookups.nameSuggestions,
    openPopup: (mode: PopupMode) =>
      isEditMode ? notifyRestricted("Lookup") : openPopupWithContext(mode),
    openProductPopup: (rowId: string | null = null) =>
      isEditMode ? notifyRestricted("Products") : handleOpenProductPopup(rowId),
    popupResults,
    productSearchFieldErrors,
    productWarehouseStocksQuery: productsHook.productWarehouseStocksQuery,
    productsQuery: {
      data: productsHook.productsQuery.data,
      error: productsHook.productsQuery.error,
      isError: productsHook.productsQuery.isError,
      isFetching: productsHook.productsQuery.isFetching,
      isLoading: productsHook.productsQuery.isLoading,
      refetch: () => void productsHook.productsQuery.refetch(),
    },
    pullFromSOModalOpen,
    pullFromSQModalOpen,
    removeProductRow: (id: string) =>
      isEditMode ? notifyRestricted("Products") : productsHook.removeProductRow(id),
    requiredCompletionPercent,
    salesEmployeeFocused: lookups.salesEmployeeFocused,
    salesEmployeeSuggestions: lookups.salesEmployeeSuggestions,
    salesEmployeesQuery: {
      data: lookups.salesEmployeesQuery.data,
      error: lookups.salesEmployeesQuery.error,
      isError: lookups.salesEmployeesQuery.isError,
      isFetching: lookups.salesEmployeesQuery.isFetching,
      isLoading: lookups.salesEmployeesQuery.isLoading,
      refetch: () => void lookups.salesEmployeesQuery.refetch(),
    },
    searchMandatoryFields,
    searchRequiredCompletionPercent,
    selectSalesEmployee: (val: LookupItem) =>
      isEditMode ? notifyRestricted("Sales Employee") : lookups.selectSalesEmployee(val),
    selectVendor: (val: LookupItem) =>
      isEditMode ? notifyRestricted("Customer") : lookups.selectVendor(val),
    selectWarehouse: (val: LookupItem) =>
      isEditMode ? notifyRestricted("Warehouse") : lookups.selectWarehouse(val),
    setActiveDatePicker,
    setBillToAddress: (val: string) =>
      isEditMode ? notifyRestricted("Bill To Address") : lookups.setBillToAddress(val),
    setCodeFocused: lookups.setCodeFocused,
    setCodeInput: (val: string) =>
      isEditMode ? notifyRestricted("Customer Code") : lookups.setCodeInput(val),
    setCreateError,
    setDocDate: (val: string) =>
      isEditMode ? notifyRestricted("Document Date") : setHeader({ docDate: val }),
    setDocDueDate: (val: string) => setHeader({ docDueDate: val }),
    setHeader: (patch: Partial<ARInvoiceHeaderState>) => {
      // In edit mode, only delivery date and remarks/comments can be updated.
      const allowedKeys = new Set(["docDueDate", "comments", "referenceNo"]);
      const patchKeys = Object.keys(patch);
      const restrictedUpdate = isEditMode && patchKeys.some((k) => !allowedKeys.has(k));

      if (restrictedUpdate) {
        notifyRestricted("Header Fields");
        return;
      }
      setHeader(patch);
    },
    setNameFocused: lookups.setNameFocused,
    setNameInput: (val: string) =>
      isEditMode ? notifyRestricted("Customer Name") : lookups.setNameInput(val),
    setProductSearchFieldErrors: setProductSearchFieldErrors as (
      val: ProductSearchFieldError,
    ) => void,
    setPullFromSOModalOpen,
    setPullFromSQModalOpen,
    setSalesEmployeeFocused: lookups.setSalesEmployeeFocused,
    setSalesEmployeeInput: (val: string) =>
      isEditMode ? notifyRestricted("Sales Employee") : lookups.setSalesEmployeeInput(val),
    setShipToAddress: (val: string) =>
      isEditMode ? notifyRestricted("Ship To Address") : lookups.setShipToAddress(val),
    setWarehouseFocused: lookups.setWarehouseFocused,
    setWarehouseInput: (val: string) =>
      isEditMode ? notifyRestricted("Warehouse") : lookups.setWarehouseInput(val),
    showEditRestrictedToast: (fieldName = "Field") => notifyRestricted(fieldName),
    summaryCurrencyLabel,
    today,
    totals,
    updateARInvoiceMutation,
    updateProductRow: (id: string, patch: Partial<ProductRow>) =>
      isEditMode ? notifyRestricted("Products") : productsHook.updateProductRow(id, patch),
    vendorsQuery: {
      data: lookups.vendorsQuery.data,
      error: lookups.vendorsQuery.error,
      isError: lookups.vendorsQuery.isError,
      isFetching: lookups.vendorsQuery.isFetching,
      isLoading: lookups.vendorsQuery.isLoading,
      refetch: () => void lookups.vendorsQuery.refetch(),
    },
    warehouseFocused: lookups.warehouseFocused,
    warehouseSuggestions: lookups.warehouseSuggestions,
    warehouses: lookups.warehouses,
    warehousesQuery: {
      data: lookups.warehousesQuery.data,
      error: lookups.warehousesQuery.error,
      isError: lookups.warehousesQuery.isError,
      isFetching: lookups.warehousesQuery.isFetching,
      isLoading: lookups.warehousesQuery.isLoading,
      refetch: () => void lookups.warehousesQuery.refetch(),
    },
  };
}
