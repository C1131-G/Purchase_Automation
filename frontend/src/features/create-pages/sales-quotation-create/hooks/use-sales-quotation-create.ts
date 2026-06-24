import { useQuery, useQueryClient } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AttachmentItem } from "@/features/create-pages/create-shared/components/grids/upload-grid";

import { formatAddressForDisplay } from "@/features/create-pages/create-shared/utils/address.utils";
import { resolveDocumentLineDiscount } from "@/features/create-pages/create-shared/utils/resolve-document-line-discount";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import {
  getMissingMandatoryCreateFieldsTyped,
  SALES_QUOTATION_MANDATORY_FIELDS,
} from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type {
  ActiveDatePicker,
  PopupMode,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  formatWarehouseDisplay,
  normalizeCreateOrderErrorMessage,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { useDocumentSaveActions } from "@/features/create-pages/create-shared/hooks/use-document-save-actions";
import { pageLoadingToast } from "@/features/create-pages/create-shared/utils/page-loading-toast";
import {
  getLookupInlineSearchByMode,
  syncLookupSearchByMode,
} from "@/features/create-pages/create-shared/utils/lookup-search-sync";
import {
  useCreateSalesQuotation,
  useUpdateSalesQuotation,
} from "@/features/create-pages/sales-quotation-create/api/sales-quotation-create.mutations";
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  FULL_PRODUCT_LIMIT,
  MANDATORY_ERROR_TEXT,
  REQUIRED_FIELD_LABEL_TEXT,
} from "@/features/create-pages/sales-quotation-create/utils/sq-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/sales-quotation-create/utils/sq-create.utils";
import {
  salesQuotationKeys,
  salesQuotationQueries,
} from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import type { SalesQuotationDetailLine } from "@/features/table-pages/sales-quotations/api/sales-quotation.service";
import {
  useResetSQCreateAction,
  useSetSQHeaderAction,
  useSQHeader,
} from "@/store/create/sq-create.store";

import { useSqLookups } from "./use-sq-lookups";
import { useSqModals } from "./use-sq-modals";
import { useSqProducts } from "./use-sq-products";

type SalesQuotationCreateMode = "create" | "edit";

interface UseSalesQuotationCreateOptions {
  mode?: SalesQuotationCreateMode;
  docNum?: string;
}

export function useSalesQuotationCreate(options?: UseSalesQuotationCreateOptions) {
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
  const header = useSQHeader();
  const resetSQCreate = useResetSQCreateAction();
  const setHeader = useSetSQHeaderAction();
  const queryClient = useQueryClient();
  const createSalesQuotationMutation = useCreateSalesQuotation();
  const updateSalesQuotationMutation = useUpdateSalesQuotation();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null);
  const [productSearchFieldErrors, setProductSearchFieldErrors] = useState<ProductSearchFieldError>(
    EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [formSnapshot, setFormSnapshot] = useState<any>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const hydratedDocNumRef = useRef<string | null>(null);
  const [hydratedDocNum, setHydratedDocNum] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const lastRestrictedToastAtRef = useRef(0);
  const loadingToastRef = useRef<ReturnType<typeof pageLoadingToast> | null>(null);
  const editDocNum = (options?.docNum ?? "").trim();

  const docDateContainerRef = useRef<HTMLDivElement>(null);
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null);

  const modals = useSqModals();

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

  const clearFieldError = useCallback((field: keyof ProductSearchFieldError) => {
    setProductSearchFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const lookups = useSqLookups({
    clearFieldError,
    closeModal: () => modals.setModalOpen(false),
    headerWarehouseCode: header.warehouseCode ?? "",
    setHeader,
    onWarehouseSelected: (warehouseCode: string) => {
      productsHook.setProductRows((prev) =>
        prev.map((row) => ({
          ...row,
          warehouseCode,
        })),
      );
    },
  });

  const productsHook = useSqProducts({
    customerLookupToken: `${lookups.codeInput.trim().toLowerCase()}::${lookups.nameInput.trim().toLowerCase()}`,
    customerSelected: Boolean(lookups.codeInput || lookups.nameInput),
    effectiveWarehouseCode: lookups.effectiveWarehouseCode,
    productPopupOpen: modals.productPopupOpen,
    productSearch: modals.productSearch,
    setProductPopupOpen: modals.setProductPopupOpen,
    setProductSearch: modals.setProductSearch,
    stockPreviewProductCode: modals.stockPreviewProduct?.code,
  });

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

  const resetForm = useCallback(() => {
    resetSQCreate();
    setSubmitAttempted(false);
    lookups.setNameInput("");
    lookups.setCodeInput("");
    lookups.resetWarehouse();
    lookups.setSalesEmployeeInput("");
    lookups.setBillToAddress("");
    lookups.setShipToAddress("");
    lookups.setNameFocused(false);
    lookups.setCodeFocused(false);
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
    hydratedDocNumRef.current = null;
    setHydratedDocNum(null);
    setFormSnapshot(null);
    setAttachments([]);
  }, [resetSQCreate, lookups, modals, productsHook]);

  const saveActions = useDocumentSaveActions({
    documentName: "Sales Quotation",
    moduleType: "sales",
    defaultUrl: "/sales/create-quotation",
    resetForm,
    getPayloadString: () => {
      const payload = {
        Address: lookups.billToAddress.trim() || lookups.shipToAddress.trim() || undefined,
        CardCode: (header.vendorCode || lookups.codeInput).trim(),
        Comments: header.comments.trim() || undefined,
        NumAtCard: header.referenceNo.trim() || undefined,
        DocDate: header.docDate,
        DocDueDate: header.docDueDate || header.docDate,
        DocumentLines: productsHook.productRows
          .filter((row) => row.productCode.trim() && row.quantity > 0)
          .map((row) => ({
            LineNum: row.lineNum,
            DiscountPercent: row.discountPercent,
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            VatGroup: row.vatGroup || undefined,
            WarehouseCode: row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
          })),
        SalesPersonCode: resolvedSalesEmployeeCode,
        attachments: attachments.map((att) => ({
          sourcePath: att.sourcePath || "",
          fileName: att.fileName,
          fileExtension: att.fileExtension || "",
          freeText: att.freeText || "",
          attachmentDate: att.attachmentDate || "",
        })),
      };
      return JSON.stringify(payload);
    },
    isEditMode,
  });

  useEffect(() => {
    if (!isEditMode) {
      resetSQCreate();
      hydratedDocNumRef.current = null;
      setHydratedDocNum(null);
    }
    return () => {
      resetSQCreate();
      lookups.resetWarehouse();
    };
  }, [isEditMode, resetSQCreate, lookups.resetWarehouse]);

  const editDetailQuery = useQuery({
    ...salesQuotationQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  });

  const isClosed =
    editDetailQuery.data?.data?.DocStatus === "Closed" ||
    editDetailQuery.data?.data?.DocStatus === "C";

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
    hydratedDocNumRef.current = currentDocNum;

    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast("Sales Quotation", "edit");
    }

    const vendorCode = String(detail.CardCode ?? "").trim();
    const vendorName = String(detail.CardName ?? "").trim();
    const matchedVendor = lookups.vendors.find((vendor) => String(vendor.code) === vendorCode);
    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? "").trim();
    const matchedWarehouse = lookups.warehouses.find((item) => String(item.code) === warehouseCode);
    const salesEmployeeNameFromDocCode =
      detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
        ? lookups.salesEmployees.find(
            (item) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(detail.SalesPersonCode),
          )?.name
        : "";
    const associatedSalesEmployeeName =
      salesEmployeeNameFromDocCode ||
      (matchedVendor?.salesEmployeeCode !== undefined
        ? lookups.salesEmployees.find(
            (item) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(matchedVendor.salesEmployeeCode),
          )?.name
        : "") ||
      matchedVendor?.salesEmployeeName?.trim() ||
      "";

    const rawComments = String(detail.Comments ?? "").trim();
    const referenceNo = String(detail.NumAtCard ?? "").trim();
    const comments = rawComments;

    const docDate = String(detail.DocDate ?? "").slice(0, 10);
    const docDueDate = String(detail.DocDueDate ?? "").slice(0, 10);
    const address = String(detail.Address ?? "").trim();
    const address2 = String((detail as Record<string, unknown>).Address2 ?? "").trim();
    void (async () => {
      try {
        const detailLines = detail.DocumentLines ?? [];
        const productsForWarehouse =
          warehouseCode.trim().length > 0
            ? await queryClient
                .fetchQuery(
                  createSharedQueries.products(warehouseCode, undefined, FULL_PRODUCT_LIMIT),
                )
                .catch((): ProductLookupItem[] => [])
            : [];

        const productByCode = new Map<string, ProductLookupItem>(
          productsForWarehouse.map((item) => [String(item.code).trim(), item]),
        );
        const stockByItemCode = new Map<string, number>();

        const uniqueItemCodes = [
          ...new Set(detailLines.map((line) => String(line.ItemCode ?? "").trim())),
        ].filter(Boolean);

        // Recover missing product metadata
        const missingItemCodes = uniqueItemCodes.filter((itemCode) => !productByCode.has(itemCode));
        if (missingItemCodes.length > 0) {
          await Promise.all(
            missingItemCodes.map(async (itemCode) => {
              const res = await queryClient
                .fetchQuery(createSharedQueries.products(undefined, itemCode, 1, "sales"))
                .catch((): ProductLookupItem[] => []);
              const matched = res.find((p) => String(p.code).trim() === itemCode);
              if (matched) {
                productByCode.set(itemCode, matched);
              }
            }),
          );
        }

        await Promise.all(
          uniqueItemCodes.map(async (itemCode) => {
            const warehouseStocks = await queryClient
              .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
              .catch(() => []);

            const resolvedStock = warehouseCode
              ? Number(
                  warehouseStocks.find((stock) => String(stock.code).trim() === warehouseCode)
                    ?.stock ?? 0,
                )
              : warehouseStocks.reduce((sum, stock) => sum + Number(stock.stock ?? 0), 0);

            stockByItemCode.set(itemCode, resolvedStock);
          }),
        );

        const mappedRows = detailLines.map((line: SalesQuotationDetailLine, index) => {
          const itemCode = String(line.ItemCode ?? "").trim();
          const productMeta = productByCode.get(itemCode);
          const quantity = Number(line.Quantity ?? 1);
          const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
          const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
            line: line as Record<string, unknown>,
            grossAmount: price * quantity,
            headerDiscountPercent: Number((detail as any).DiscountPercent ?? 0),
          });
          return {
            id: `row-${currentDocNum}-${index}`,
            productCode: itemCode,
            productName: String(line.ItemDescription ?? productMeta?.name ?? "").trim(),
            stock: Number(stockByItemCode.get(itemCode) ?? productMeta?.stock ?? 0),
            price,
            currency: String(detail.DocCurr ?? productMeta?.currency ?? ""),
            vatGroup: String(line.VatGroup ?? line.TaxCode ?? productMeta?.vatGroup ?? "").trim(),
            // SAP line tax is authoritative; fall back to product master only when missing
            taxRate:
              (line as Record<string, unknown>).VatPrcnt !== undefined &&
              (line as Record<string, unknown>).VatPrcnt !== null
                ? Number((line as Record<string, unknown>).VatPrcnt)
                : Number(productMeta?.taxRate ?? 0),
            uomCode: (() => {
              const rawLine = line as any;
              const code = String(
                rawLine.UoMCode ?? rawLine.uomCode ?? rawLine.UomCode ?? "",
              ).trim();
              if (code) return code;
              const entry = Number(rawLine.UoMEntry ?? rawLine.uomEntry ?? rawLine.UomEntry);
              if (Number.isFinite(entry) && entry > 0) {
                const match = productMeta?.uomList?.find((u) => u.uomEntry === entry);
                if (match?.code) return match.code;
              }
              return String(productMeta?.uomCode ?? "").trim();
            })(),
            uomEntry: (() => {
              const rawLine = line as any;
              const entry = Number(rawLine.UoMEntry ?? rawLine.uomEntry ?? rawLine.UomEntry);
              if (Number.isFinite(entry) && entry > 0) return entry;
              const code = String(
                rawLine.UoMCode ?? rawLine.uomCode ?? rawLine.UomCode ?? "",
              ).trim();
              if (code) {
                const match = productMeta?.uomList?.find((u) => u.code === code);
                if (match?.uomEntry !== undefined) return match.uomEntry;
              }
              return productMeta?.uomEntry;
            })(),
            purchaseUomCode: productMeta?.purchaseUomCode,
            purchaseUomEntry: productMeta?.purchaseUomEntry,
            salesUomCode: productMeta?.uomCode,
            salesUomEntry: productMeta?.uomEntry,
            uomList: productMeta?.uomList,
            quantity,
            discountPercent,
            discountAmount,
            comment: "",
            warehouseCode: String(line.WarehouseCode ?? "").trim(),
            selected: false,
          };
        });

        setHeader({
          comments,
          docDate: docDate || header.docDate,
          docDueDate,
          referenceNo,
          vendorCode,
          vendorName,
          warehouseCode,
        });
        lookups.setNameInput(vendorName);
        lookups.setCodeInput(vendorCode);
        lookups.setWarehouseInput(
          formatWarehouseDisplay(matchedWarehouse?.name ?? warehouseCode, warehouseCode),
        );
        lookups.setSalesEmployeeInput(associatedSalesEmployeeName);
        lookups.setBillToAddress(address);
        lookups.setShipToAddress(address2);
        productsHook.setProductRows(mappedRows);
        productsHook.setProductRowDrafts({});

        const rawAttachments = detail.attachments || [];
        setAttachments(
          rawAttachments.map((item: any, idx: number) => ({
            id: `loaded-${idx}-${item.fileName}`,
            fileName: item.fileName,
            fileExtension: item.fileExtension,
            sourcePath: item.sourcePath,
            attachmentDate: item.attachmentDate,
            freeText: item.freeText || "",
            targetPath: `${item.sourcePath}\\${item.fileName}.${item.fileExtension}`,
          })),
        );

        setFormSnapshot({
          comments: comments.trim(),
          referenceNo: referenceNo.trim(),
          docDueDate: docDueDate,
          salesEmployee: associatedSalesEmployeeName.trim(),
          warehouseCode: warehouseCode.trim(),
          billToAddress: formatAddressForDisplay(address).trim(),
          shipToAddress: formatAddressForDisplay(address2).trim(),
          attachments: rawAttachments.map((item: any) => ({
            fileName: item.fileName,
            freeText: item.freeText || item.remarks || "",
          })),
          productRows: mappedRows
            .filter((row) => row.productCode.trim() && row.quantity > 0)
            .map((row) => ({
              productCode: row.productCode,
              quantity: row.quantity,
              price: row.price,
              discountPercent: row.discountPercent,
              warehouseCode: row.warehouseCode,
            })),
        });

        hydratedDocNumRef.current = currentDocNum;
        setHydratedDocNum(currentDocNum);
      } finally {
        loadingToastRef.current?.dismiss();
        loadingToastRef.current = null;
      }
    })();
  }, [
    queryClient,
    editDetailQuery.data,
    header.docDate,
    isEditMode,
    lookups,
    editDocNum,
    productsHook,
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

  // Create & Validation computations
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
      warehouseCode: lookups.effectiveWarehouseCode.trim(),
    }),
    [
      lookups.codeInput,
      header.vendorCode,
      lookups.nameInput,
      header.vendorName,
      lookups.effectiveWarehouseCode,
      header.docDueDate,
      lookups.salesEmployeeInput,
      lookups.billToAddress,
      lookups.shipToAddress,
      header.referenceNo,
      header.comments,
    ],
  );

  const missingMandatoryFields = useMemo(
    () =>
      getMissingMandatoryCreateFieldsTyped(createMandatoryValues, SALES_QUOTATION_MANDATORY_FIELDS),
    [createMandatoryValues],
  );

  const searchMandatoryFields = useMemo(() => ["vendorName", "vendorCode"] as const, []);
  const missingSearchMandatoryFields = useMemo(
    () =>
      searchMandatoryFields.filter((field) => !String(createMandatoryValues[field] ?? "").trim()),
    [createMandatoryValues, searchMandatoryFields],
  );

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
        ? `Add at least one product row before ${isEditMode ? "updating" : "creating"} sales quotation.`
        : null;

  const requiredCompletionPercent =
    ((SALES_QUOTATION_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      SALES_QUOTATION_MANDATORY_FIELDS.length) *
    100;

  const requiredFieldsErrorText = `Fill required fields before ${isEditMode ? "updating" : "creating"} sales quotation.`;
  const rowsErrorText = `Add at least one product row before ${isEditMode ? "updating" : "creating"} sales quotation.`;
  const warehouseErrorText = "Warehouse must be selected for all product rows.";

  const visibleCreateError =
    createError === requiredFieldsErrorText && !createDisabledReason
      ? null
      : createError === rowsErrorText && hasValidRowsForCreate
        ? null
        : createError === warehouseErrorText && !hasRowsWithoutWarehouse
          ? null
          : createError;

  function handleCreateOrderAction(action: "save-new" | "view" | "close" | "draft" = "save-new") {
    void handleCreateOrder(action);
  }

  const handleCreateOrder = async (
    action: "save-new" | "view" | "close" | "draft" = "save-new",
  ) => {
    if (action === "draft") {
      await saveActions.handleActionSuccess("draft");
      setSubmitAttempted(false);
      return;
    }

    setSubmitAttempted(true);
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

    if (isEditMode && !isDirty) {
      const noChangeMessage = "Change at least one field before update.";
      setCreateError(noChangeMessage);
      goeyToast.error(noChangeMessage, { id: "no-change-update-toast" });
      return;
    }

    setCreateError(null);

    const payload = isEditMode
      ? {
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          Comments: header.comments.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          DocumentLines: validRows.map((row) => ({
            LineNum: row.lineNum,
            DiscountPercent: row.discountPercent,
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            VatGroup: row.vatGroup || undefined,
            WarehouseCode: row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
          })),
          SalesPersonCode: resolvedSalesEmployeeCode,
          attachments: attachments.map((att) => ({
            sourcePath: att.sourcePath || "",
            fileName: att.fileName,
            fileExtension: att.fileExtension || "",
            freeText: att.freeText || "",
            attachmentDate: att.attachmentDate || "",
          })),
        }
      : {
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          CardCode: (header.vendorCode || lookups.codeInput).trim(),
          Comments: header.comments.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          DocumentLines: validRows.map((row) => ({
            LineNum: row.lineNum,
            DiscountPercent: row.discountPercent,
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            VatGroup: row.vatGroup || undefined,
            WarehouseCode: row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
          })),
          SalesPersonCode: resolvedSalesEmployeeCode,
          attachments: attachments.map((att) => ({
            sourcePath: att.sourcePath || "",
            fileName: att.fileName,
            fileExtension: att.fileExtension || "",
            freeText: att.freeText || "",
            attachmentDate: att.attachmentDate || "",
          })),
        };

    saveActions.startSaveTracking(isEditMode ? "update" : action);
    saveActions.actionToast.startLoading("Sales Quotation", isEditMode ? "update" : action);
    try {
      let createdDocNum: string | number | undefined;
      if (isEditMode) {
        const detail = editDetailQuery.data?.data;
        const docEntry = detail?.DocEntry ?? detail?.id;
        if (docEntry === undefined || docEntry === null) {
          setCreateError("Unable to update sales quotation. Document id is missing.");
          saveActions.actionToast.showError("Sales Quotation", "update", "Document ID is missing.");
          return;
        }
        await updateSalesQuotationMutation.mutateAsync({
          id: docEntry,
          payload,
        });
        createdDocNum = detail?.DocNum;
        hydratedDocNumRef.current = null;
        setHydratedDocNum(null);
        setFormSnapshot(null);
      } else {
        const result = await createSalesQuotationMutation.mutateAsync({
          payload,
        });
        createdDocNum = (result as { data?: { DocNum?: number } }).data?.DocNum;
      }

      saveActions.trackMutationSuccess();

      // Proactive Cache Revalidation
      void queryClient.invalidateQueries({ queryKey: salesQuotationKeys.all });
      void Promise.allSettled([
        queryClient.prefetchQuery(salesQuotationQueries.list({ limit: 10, page: 1 })),
        queryClient.prefetchQuery(salesQuotationQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(salesQuotationQueries.docNumSuggestions(undefined, 100)),
      ]);

      if (isEditMode) {
        const currentDocNum = (options?.docNum ?? "").trim();
        if (currentDocNum) {
          void queryClient.invalidateQueries(salesQuotationQueries.detailByDocNum(currentDocNum));
        }
        lookups.resetWarehouse();
      }

      await saveActions.handleActionSuccess(isEditMode ? "update" : action, createdDocNum);
    } catch (error) {
      const errorMessage = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isEditMode ? "update" : "create"} sales quotation. Try again.`,
      );
      saveActions.actionToast.showError(
        "Sales Quotation",
        isEditMode ? "update" : action,
        errorMessage,
      );
      setCreateError(errorMessage);
    }
  };

  const submitSalesQuotationMutation = isEditMode
    ? updateSalesQuotationMutation
    : createSalesQuotationMutation;
  const isDirty = useMemo(() => {
    if (!isEditMode || !formSnapshot) {
      return false;
    }
    const current = {
      comments: header.comments.trim(),
      referenceNo: header.referenceNo.trim(),
      docDueDate: header.docDueDate,
      salesEmployee: lookups.salesEmployeeInput.trim(),
      warehouseCode: lookups.effectiveWarehouseCode.trim(),
      billToAddress: formatAddressForDisplay(lookups.billToAddress).trim(),
      shipToAddress: formatAddressForDisplay(lookups.shipToAddress).trim(),
      attachments: attachments.map((att) => ({
        fileName: att.fileName,
        freeText: att.freeText || "",
      })),
      productRows: productsHook.productRows
        .filter((row) => row.productCode.trim() && row.quantity > 0)
        .map((row) => ({
          productCode: row.productCode,
          quantity: row.quantity,
          price: row.price,
          discountPercent: row.discountPercent,
          warehouseCode: row.warehouseCode,
        })),
    };
    return JSON.stringify(current) !== JSON.stringify(formSnapshot);
  }, [
    isEditMode,
    formSnapshot,
    header.comments,
    header.referenceNo,
    header.docDueDate,
    lookups.salesEmployeeInput,
    lookups.effectiveWarehouseCode,
    lookups.billToAddress,
    lookups.shipToAddress,
    productsHook.productRows,
    attachments,
  ]);

  const submitDisabled = isEditMode ? !isDirty : false;

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

  return {
    ...lookups,
    ...modals,
    ...productsHook,
    activeDatePicker,
    applyProductToRow: (product: ProductLookupItem) =>
      productsHook.applyProductToRow(product, {
        closeProductPopup: () => modals.setProductPopupOpen(false),
      }),
    applyProductsToRows: (products: ProductLookupItem[]) =>
      productsHook.applyProductsToRows(products, {
        closeProductPopup: () => modals.setProductPopupOpen(false),
      }),
    submitDisabled,
    createDisabledReason,
    createError: visibleCreateError,
    createSalesQuotationMutation: submitSalesQuotationMutation,
    deliveryDateContainerRef,
    docDateContainerRef,
    editDetailQuery,
    handleCreateOrder: handleCreateOrderAction,
    handleLookupModalSearchSync,
    header,
    isEditHydrated,
    isEditMode,
    isSaved: saveActions.isSaved,
    savedDocNum: saveActions.savedDocNum,
    missingMandatoryFields,
    missingSearchMandatoryFields,
    openPopup: openPopupWithContext,
    openProductPopup: handleOpenProductPopup,
    popupResults,
    productSearchFieldErrors,
    requiredCompletionPercent,
    resetForm: saveActions.handleReset,
    searchMandatoryFields,
    searchRequiredCompletionPercent,
    setActiveDatePicker,
    setCreateError,
    setHeader,
    setProductSearchFieldErrors,
    showEditRestrictedToast: (fieldName = "Field") => notifyRestricted(fieldName),
    submitAttempted,
    summaryCurrencyLabel,
    today,
    totals,
    trackerDocType: isEditMode ? "sales-quotation" : null,
    trackerDocEntry: isEditMode
      ? (editDetailQuery.data?.data?.DocEntry ?? editDetailQuery.data?.data?.id)
      : null,
    updateSalesQuotationMutation,
    isClosed,
    attachments,
    setAttachments,
  };
}
