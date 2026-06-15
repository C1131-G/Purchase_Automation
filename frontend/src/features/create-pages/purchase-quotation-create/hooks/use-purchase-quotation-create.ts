import { useQuery, useQueryClient } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import {
  getMissingMandatoryCreateFieldsTyped,
  PURCHASE_QUOTATION_MANDATORY_FIELDS,
} from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from "@/features/create-pages/create-shared/utils/create-order.calculations";
import { resolveDocumentLineDiscount } from "@/features/create-pages/create-shared/utils/resolve-document-line-discount";
import type {
  ActiveDatePicker,
  PopupMode,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { normalizeCreateOrderErrorMessage } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { formatWarehouseDisplay } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { useDocumentSaveActions } from "@/features/create-pages/create-shared/hooks/use-document-save-actions";
import { useEditDirtyState } from "@/features/create-pages/create-shared/hooks/use-edit-dirty-state";
import { pageLoadingToast } from "@/features/create-pages/create-shared/utils/page-loading-toast";
import {
  getLookupInlineSearchByMode,
  syncLookupSearchByMode,
} from "@/features/create-pages/create-shared/utils/lookup-search-sync";
import {
  useCreatePurchaseQuotation,
  useUpdatePurchaseQuotation,
} from "@/features/create-pages/purchase-quotation-create/api/purchase-quotation-create.mutations";
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  FULL_PRODUCT_LIMIT,
  MANDATORY_ERROR_TEXT,
  REQUIRED_FIELD_LABEL_TEXT,
} from "@/features/create-pages/purchase-quotation-create/utils/pq-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/purchase-quotation-create/utils/pq-create.utils";
import {
  purchaseQuotationKeys,
  purchaseQuotationQueries,
} from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import type { PurchaseQuotationDetailLine } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.service";
import {
  useResetPQCreateAction,
  useSetPQHeaderAction,
  usePqHeader,
} from "@/store/create/pq-create.store";

import { usePqLookups } from "./use-pq-lookups";
import { usePqModals } from "./use-pq-modals";
import { usePqProducts } from "./use-pq-products";

type PurchaseQuotationCreateMode = "create" | "edit";

interface UsePurchaseQuotationCreateOptions {
  mode?: PurchaseQuotationCreateMode;
  docNum?: string;
  onCreateSuccess?: () => void;
}

export function usePurchaseQuotationCreate(options?: UsePurchaseQuotationCreateOptions) {
  const normalizeCodeForCompare = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return "";
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase();
  };

  const parsePurchaseQuotationHeaderNotes = (detail: {
    Comments?: unknown;
    NumAtCard?: unknown;
  }) => {
    const referenceNo = String(detail.NumAtCard ?? "").trim();
    const rawComments = String(detail.Comments ?? "").trim();

    if (referenceNo) {
      const legacyReferencePrefix = `${referenceNo} | `;
      return {
        comments: rawComments.startsWith(legacyReferencePrefix)
          ? rawComments.slice(legacyReferencePrefix.length).trim()
          : rawComments,
        referenceNo,
      };
    }

    const splitComments = rawComments.split(" | ").map((part) => part.trim());
    if (splitComments.length > 1) {
      return {
        comments: splitComments.slice(1).join(" | "),
        referenceNo: splitComments[0] ?? "",
      };
    }

    return {
      comments: rawComments,
      referenceNo,
    };
  };

  const getEffectivePurchaseQuotationDueDate = (docDueDate: string, docDate: string) => {
    const trimmedDocDueDate = docDueDate.trim();
    if (trimmedDocDueDate) {
      return trimmedDocDueDate;
    }
    return docDate.trim();
  };

  const mode = options?.mode ?? "create";
  const isEditMode = mode === "edit";
  const header = usePqHeader();
  const resetPQCreate = useResetPQCreateAction();
  const setHeader = useSetPQHeaderAction();
  const queryClient = useQueryClient();
  const createPurchaseQuotationMutation = useCreatePurchaseQuotation();
  const updatePurchaseQuotationMutation = useUpdatePurchaseQuotation();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null);
  const [productSearchFieldErrors, setProductSearchFieldErrors] = useState<ProductSearchFieldError>(
    EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const hydratedDocNumRef = useRef<string | null>(null);
  const [hydratedDocNum, setHydratedDocNum] = useState<string | null>(null);
  const lastRestrictedToastAtRef = useRef(0);
  const loadingToastRef = useRef<ReturnType<typeof pageLoadingToast> | null>(null);
  const editDocNum = (options?.docNum ?? "").trim();

  const docDateContainerRef = useRef<HTMLDivElement>(null);
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null);

  const modals = usePqModals();

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

  const lookups = usePqLookups({
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

  const productsHook = usePqProducts({
    effectiveWarehouseCode: lookups.effectiveWarehouseCode,
    productPopupOpen: modals.productPopupOpen,
    productSearch: modals.productSearch,
    setProductPopupOpen: modals.setProductPopupOpen,
    setProductSearch: modals.setProductSearch,
    stockPreviewProductCode: modals.stockPreviewProduct?.code,
    vendorLookupToken: `${lookups.codeInput.trim().toLowerCase()}::${lookups.nameInput.trim().toLowerCase()}`,
    vendorSelected: Boolean(lookups.codeInput || lookups.nameInput),
  });

  useEffect(() => {
    if (!isEditMode) {
      resetPQCreate();
      hydratedDocNumRef.current = null;
      setHydratedDocNum(null);
    }
    return () => {
      resetPQCreate();
      lookups.resetWarehouse();
    };
  }, [isEditMode, resetPQCreate, lookups.resetWarehouse]);

  const editDetailQuery = useQuery({
    ...purchaseQuotationQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  });

  const isClosed =
    editDetailQuery.data?.data?.DocStatus === "Closed" ||
    editDetailQuery.data?.data?.DocStatus === "bost_Close" ||
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

    // Show loading toast when starting edit hydration
    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast("Purchase Quotation", "edit");
    }

    void (async () => {
      try {
        const vendorCode = String(detail.CardCode ?? "").trim();
        const vendorName = String(detail.CardName ?? "").trim();
        const matchedVendor = lookups.vendors.find((vendor) => String(vendor.code) === vendorCode);
        const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? "").trim();
        const matchedWarehouse = lookups.warehouses.find(
          (item) => String(item.code) === warehouseCode,
        );
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

        const { comments, referenceNo } = parsePurchaseQuotationHeaderNotes(detail);

        const docDate = String(detail.DocDate ?? "").slice(0, 10);
        const docDueDate = String(detail.DocDueDate ?? "").slice(0, 10);
        const effectiveDocDueDate = getEffectivePurchaseQuotationDueDate(docDueDate, docDate);
        const address = String(detail.Address ?? "").trim();

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

        const mappedRows = detailLines.map((line: PurchaseQuotationDetailLine, index) => {
          const itemCode = String(line.ItemCode ?? "").trim();
          const productMeta = productByCode.get(itemCode);
          // Purchase Quotation stores the user-entered quantity in PQT1.PQTReqQty
          // (Service Layer: RequiredQuantity). The backend surfaces this as
          // line.Quantity on read, so prefer RequiredQuantity as a defensive
          // fallback for older payloads.
          const lineData = line as Record<string, unknown>;
          const quantity = Number(
            lineData.RequiredQuantity ?? lineData.requiredQuantity ?? line.Quantity ?? 1,
          );
          // OpenQty is the real remaining-fulfillable quantity. Surface it on the
          // row so downstream CopyTo cascades (PO/GRPO/AP Invoice) and any
          // partial-fulfillment UI can consume it.
          const openQty = Number(
            lineData.OpenQty ?? lineData.OpenQuantity ?? lineData.RemainingOpenQuantity ?? quantity,
          );
          const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
          const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
            grossAmount: price * quantity,
            headerDiscountPercent: Number((detail as Record<string, unknown>).DiscountPercent ?? 0),
            line: line as Record<string, unknown>,
          });
          const requiredDate = String(line.ReqDate ?? line.RequiredDate ?? effectiveDocDueDate)
            .trim()
            .slice(0, 10);
          return {
            id: `row-${currentDocNum}-${index}`,
            lineNum: typeof line.LineNum === "number" ? line.LineNum : index,
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
            uomCode: String(line.UoMCode ?? productMeta?.uomCode ?? "").trim(),
            uomEntry:
              typeof line.UoMEntry === "number" && Number.isFinite(line.UoMEntry)
                ? line.UoMEntry
                : productMeta?.uomEntry,
            quantity,
            discountPercent,
            discountAmount,
            comment: "",
            warehouseCode: String(line.WarehouseCode ?? "").trim(),
            requiredDate,
            openQty,
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
        lookups.setShipToAddress(address);
        productsHook.setProductRows(mappedRows);
        productsHook.setProductRowDrafts({});

        setFormSnapshot({
          comments: comments.trim(),
          referenceNo: referenceNo.trim(),
          docDate: docDate,
          docDueDate: docDueDate,
          salesEmployee: associatedSalesEmployeeName.trim(),
          warehouseCode: warehouseCode.trim(),
          billToAddress: address.trim(),
          shipToAddress: address.trim(),
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
        // Dismiss loading toast when edit hydration is complete (success or error)
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
          nextErrors.vendorName = "Vendor Name is required.";
        }
        if (!lookups.codeInput.trim()) {
          nextErrors.vendorCode = "Vendor Code is required.";
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
      getMissingMandatoryCreateFieldsTyped(
        createMandatoryValues,
        PURCHASE_QUOTATION_MANDATORY_FIELDS,
      ),
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
  const validRows = useMemo(
    () => productsHook.productRows.filter((row) => row.productCode.trim() && row.quantity > 0),
    [productsHook.productRows],
  );

  const hasValidRowsForCreate = validRows.length > 0;

  const {
    isDirty,
    setFormSnapshot,
    submitDisabled: dirtySubmitDisabled,
  } = useEditDirtyState({
    isEditMode,
    currentFields: useMemo(
      () => ({
        comments: header.comments.trim(),
        referenceNo: header.referenceNo.trim(),
        docDate: header.docDate,
        docDueDate: header.docDueDate,
        salesEmployee: lookups.salesEmployeeInput.trim(),
        warehouseCode: lookups.effectiveWarehouseCode.trim(),
        billToAddress: lookups.billToAddress.trim(),
        shipToAddress: lookups.shipToAddress.trim(),
        productRows: validRows.map((row) => ({
          productCode: row.productCode,
          quantity: row.quantity,
          price: row.price,
          discountPercent: row.discountPercent,
          warehouseCode: row.warehouseCode,
        })),
      }),
      [
        header.comments,
        header.referenceNo,
        header.docDate,
        header.docDueDate,
        lookups.salesEmployeeInput,
        lookups.effectiveWarehouseCode,
        lookups.billToAddress,
        lookups.shipToAddress,
        validRows,
      ],
    ),
  });

  const resetForm = useCallback(() => {
    resetPQCreate();
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
  }, [resetPQCreate, lookups, modals, productsHook]);

  const createDisabledReason =
    missingMandatoryFields.length > 0
      ? `Complete required fields: ${missingMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field as keyof typeof REQUIRED_FIELD_LABEL_TEXT]).join(", ")}.`
      : !hasValidRowsForCreate
        ? `Add at least one product row before ${isEditMode ? "updating" : "creating"} Purchase Quotation.`
        : null;

  const requiredCompletionPercent =
    ((PURCHASE_QUOTATION_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      PURCHASE_QUOTATION_MANDATORY_FIELDS.length) *
    100;

  const requiredFieldsErrorText = `Fill required fields before ${isEditMode ? "updating" : "creating"} Purchase Quotation.`;
  const rowsErrorText = `Add at least one product row before ${isEditMode ? "updating" : "creating"} Purchase Quotation.`;

  const visibleCreateError =
    createError === requiredFieldsErrorText && !createDisabledReason
      ? null
      : createError === rowsErrorText && hasValidRowsForCreate
        ? null
        : createError;

  const warehouseErrors = useMemo(() => {
    return {} as Record<string, string>;
  }, []);

  const saveActions = useDocumentSaveActions({
    documentName: "Purchase Quotation",
    moduleType: "purchase",
    defaultUrl: "/purchase/create-quotation",
    resetForm,
    getPayloadString: () => {
      const payload = {
        Address: lookups.billToAddress.trim() || lookups.shipToAddress.trim() || undefined,
        CardCode: (header.vendorCode || lookups.codeInput).trim(),
        Comments: header.comments.trim() || undefined,
        NumAtCard: header.referenceNo.trim() || undefined,
        DocDate: header.docDate,
        DocDueDate: getEffectivePurchaseQuotationDueDate(header.docDueDate, header.docDate),
        DocumentLines: productsHook.productRows.map((row) => ({
          LineNum: row.lineNum,
          DiscountPercent: row.discountPercent,
          ItemCode: row.productCode,
          ReqDate: getEffectivePurchaseQuotationDueDate(header.docDueDate, header.docDate),
          Quantity: row.quantity,
          UnitPrice: row.price,
          UoMCode: row.uomCode || undefined,
          UoMEntry: row.uomEntry ?? undefined,
          VatGroup: row.vatGroup || undefined,
          WarehouseCode: row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
        })),
        SalesPersonCode: resolvedSalesEmployeeCode,
      };
      return JSON.stringify(payload);
    },
    isEditMode,
  });

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
          Address: lookups.billToAddress.trim() || lookups.shipToAddress.trim() || undefined,
          Comments: header.comments.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: getEffectivePurchaseQuotationDueDate(header.docDueDate, header.docDate),
          // When closed, SAP blocks line-level field updates (ShipDate/ReqDate → ODBC -1029).
          // Only send DocumentLines for open documents.
          ...(isClosed
            ? {}
            : {
                RequriedDate: getEffectivePurchaseQuotationDueDate(
                  header.docDueDate,
                  header.docDate,
                ),
                DocumentLines: validRows.map((row) => ({
                  LineNum: row.lineNum,
                  DiscountPercent: row.discountPercent,
                  ItemCode: row.productCode,
                  ReqDate: getEffectivePurchaseQuotationDueDate(header.docDueDate, header.docDate),
                  Quantity: row.quantity,
                  UnitPrice: row.price,
                  UoMCode: row.uomCode || undefined,
                  UoMEntry: row.uomEntry ?? undefined,
                  VatGroup: row.vatGroup || undefined,
                  WarehouseCode:
                    row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
                })),
              }),
          SalesPersonCode: resolvedSalesEmployeeCode,
        }
      : {
          Address: lookups.billToAddress.trim() || lookups.shipToAddress.trim() || undefined,
          CardCode: (header.vendorCode || lookups.codeInput).trim(),
          DocCurrency:
            summaryCurrencyLabel !== "$" && summaryCurrencyLabel !== "MULTI" && summaryCurrencyLabel
              ? summaryCurrencyLabel
              : lookups.vendors.find(
                  (v) => String(v.code) === String(header.vendorCode || lookups.codeInput).trim(),
                )?.currency || undefined,
          Comments: header.comments.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: getEffectivePurchaseQuotationDueDate(header.docDueDate, header.docDate),
          DocumentLines: validRows.map((row) => ({
            LineNum: row.lineNum,
            DiscountPercent: row.discountPercent,
            ItemCode: row.productCode,
            ReqDate: getEffectivePurchaseQuotationDueDate(header.docDueDate, header.docDate),
            Quantity: row.quantity,
            UnitPrice: row.price,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            VatGroup: row.vatGroup || undefined,
            WarehouseCode: row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
          })),
          SalesPersonCode: resolvedSalesEmployeeCode,
        };

    saveActions.actionToast.startLoading("Purchase Quotation", isEditMode ? "update" : action);
    try {
      let createdDocNum: string | number | undefined;
      if (isEditMode) {
        const detail = editDetailQuery.data?.data;
        const docEntry = detail?.DocEntry ?? detail?.id;
        if (docEntry === undefined || docEntry === null) {
          setCreateError("Unable to update Purchase Quotation. Document id is missing.");
          saveActions.actionToast.showError(
            "Purchase Quotation",
            "update",
            "Document ID is missing.",
          );
          return;
        }
        await updatePurchaseQuotationMutation.mutateAsync({
          id: docEntry,
          payload,
        });
        createdDocNum = detail?.DocNum;
        hydratedDocNumRef.current = null;
        setHydratedDocNum(null);
        setFormSnapshot(null);
      } else {
        const result = await createPurchaseQuotationMutation.mutateAsync({
          payload,
        });
        createdDocNum = (result as { data?: { DocNum?: number } }).data?.DocNum;
      }

      // Proactive Cache Revalidation
      void queryClient.invalidateQueries({ queryKey: purchaseQuotationKeys.all });
      void Promise.allSettled([
        queryClient.prefetchQuery(purchaseQuotationQueries.list({ limit: 10, page: 1 })),
        queryClient.prefetchQuery(purchaseQuotationQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(purchaseQuotationQueries.docNumSuggestions(undefined, 100)),
      ]);

      await saveActions.handleActionSuccess(isEditMode ? "update" : action, createdDocNum);
    } catch (error) {
      const errorMessage = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isEditMode ? "update" : "create"} Purchase Quotation. Try again.`,
      );
      saveActions.actionToast.showError(
        "Purchase Quotation",
        isEditMode ? "update" : action,
        errorMessage,
      );
      setCreateError(errorMessage);
    }
  };

  const submitPurchaseQuotationMutation = isEditMode
    ? updatePurchaseQuotationMutation
    : createPurchaseQuotationMutation;

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
    createDisabledReason,
    createError: visibleCreateError,
    submitAttempted,
    warehouseErrors,
    createPurchaseQuotationMutation: submitPurchaseQuotationMutation,
    deliveryDateContainerRef,
    docDateContainerRef,
    editDetailQuery,
    handleCreateOrder: handleCreateOrderAction,
    handleLookupModalSearchSync,
    header,
    isClosed,
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
    summaryCurrencyLabel,
    today,
    totals,
    trackerDocType: isEditMode ? ("purchase-quotation" as const) : null,
    trackerDocEntry: isEditMode
      ? (editDetailQuery.data?.data?.DocEntry ?? editDetailQuery.data?.data?.id)
      : null,
    updatePurchaseQuotationMutation,
    submitDisabled: dirtySubmitDisabled,
  };
}
