import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AttachmentItem } from "@/features/create-pages/create-shared/components/grids/upload-grid";

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
import {
  resolveHydrateProductMeta,
  scheduleHydrateWarehouseStocks,
} from "@/features/create-pages/create-shared/utils/hydrate-product-meta";
import { isPqLockedAfterRfqSubmit } from "@/features/create-pages/create-shared/utils/pq-rfq-copy";
import { sapCommentsField } from "@/features/create-pages/create-shared/utils/sap-document-fields";
import { parseDocumentHeaderNotes } from "@/features/create-pages/create-shared/utils/parse-header-notes";
import type {
  ActiveDatePicker,
  PopupMode,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  formatWarehouseDisplay,
  normalizeCreateOrderErrorMessage,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import {
  dismissDocumentHydrating,
  notifyCreateApiError,
  notifyDocumentHydrating,
  notifyEditRestrictedField,
  notifyPqRfqLocked,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import { resolveDocCurrencyForPayload } from "@/shared/utils/currency";
import { useDocumentSaveActions } from "@/features/create-pages/create-shared/hooks/use-document-save-actions";
import { useDocumentBranchField } from "@/features/create-pages/create-shared/hooks/use-document-branch-field";
import { useDocumentSeriesField } from "@/features/create-pages/create-shared/hooks/use-document-series-field";
import { useEditDirtyState } from "@/features/create-pages/create-shared/hooks/use-edit-dirty-state";
import { reconcileAddresses } from "@/features/create-pages/create-shared/utils/address.utils";
import { documentBranchPayload } from "@/features/create-pages/create-shared/utils/document-branch";
import {
  documentSeriesPayload,
  SAP_SERIES_OBJECT,
  toPositiveSeries,
} from "@/features/create-pages/create-shared/utils/document-series";
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
  draftDocNum?: string | undefined;
  draftDocEntry?: string | undefined;
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

  const parsePurchaseQuotationHeaderNotes = parseDocumentHeaderNotes;

  const getEffectivePurchaseQuotationDueDate = (docDueDate: string, docDate: string) => {
    const trimmedDocDueDate = docDueDate.trim();
    if (trimmedDocDueDate) {
      return trimmedDocDueDate;
    }
    return docDate.trim();
  };

  /** Header Required Date (SAP RequriedDate) with fallbacks for older docs. */
  const getEffectivePurchaseQuotationRequiredDate = (
    requiredDate: string,
    docDueDate: string,
    docDate: string,
  ) => {
    const trimmedRequiredDate = requiredDate.trim();
    if (trimmedRequiredDate) {
      return trimmedRequiredDate;
    }
    return getEffectivePurchaseQuotationDueDate(docDueDate, docDate);
  };

  /**
   * Map a product row → SAP PQ DocumentLine (strict split, no cross-copy):
   *   quantity         → Quantity          (quoted qty; 0 until vendor quotes)
   *   requiredQuantity → RequiredQuantity  (PQTReqQty; enabled on create)
   *   requiredDate     → ReqDate           (enabled; falls back to header)
   *   quotedDate       → ShipDate          (disabled on create; omit when empty)
   */
  const mapPqDocumentLine = (
    row: {
      lineNum?: number | undefined;
      discountPercent: number;
      productCode: string;
      quantity: number;
      requiredQuantity?: number | undefined;
      requiredDate?: string | undefined;
      quotedDate?: string | undefined;
      price: number;
      uomCode?: string | undefined;
      uomEntry?: number | undefined;
      vatGroup: string;
      warehouseCode: string;
    },
    fallbackRequiredDate: string,
    fallbackWarehouse: string,
  ) => {
    const quotedQty = Number(row.quantity ?? 0);
    const requiredQty = Number(
      row.requiredQuantity !== undefined && row.requiredQuantity !== null
        ? row.requiredQuantity
        : 1,
    );
    const lineReqDate = String(row.requiredDate || fallbackRequiredDate || "")
      .trim()
      .slice(0, 10);
    // Do not copy required date into quoted date.
    const lineQuotedDate = String(row.quotedDate || "")
      .trim()
      .slice(0, 10);
    return {
      LineNum: row.lineNum,
      DiscountPercent: row.discountPercent,
      ItemCode: row.productCode,
      Quantity: Number.isFinite(quotedQty) ? quotedQty : 0,
      RequiredQuantity: Number.isFinite(requiredQty) && requiredQty >= 1 ? requiredQty : 1,
      ...(lineReqDate ? { ReqDate: lineReqDate } : {}),
      ...(lineQuotedDate ? { ShipDate: lineQuotedDate } : {}),
      UnitPrice: row.price,
      UoMCode: row.uomCode || undefined,
      UoMEntry: row.uomEntry ?? undefined,
      VatGroup: row.vatGroup || undefined,
      WarehouseCode: row.warehouseCode || fallbackWarehouse || undefined,
    };
  };

  /** Hydrate PQ product row qty/dates from SAP line — keep fields independent. */
  const mapSapLineQtyAndDates = (
    line: PurchaseQuotationDetailLine,
    fallbackRequiredDate: string,
  ) => {
    const lineData = line as Record<string, unknown>;
    // Quoted qty = Quantity only (never invent from required qty).
    const sapQuotedQty = Number(line.Quantity ?? lineData.Quantity ?? 0);
    const sapRequiredQty = Number(
      line.RequiredQuantity ??
        lineData.RequiredQuantity ??
        lineData.requiredQuantity ??
        lineData.PQTReqQty ??
        0,
    );
    const quantity = Number.isFinite(sapQuotedQty) && sapQuotedQty > 0 ? sapQuotedQty : 0;
    // Required qty prefers SAP RequiredQuantity; only fall back to quoted for
    // legacy single-qty docs that never wrote PQTReqQty.
    const requiredQuantity =
      Number.isFinite(sapRequiredQty) && sapRequiredQty > 0
        ? sapRequiredQty
        : quantity > 0
          ? quantity
          : 1;
    const requiredDate = String(
      line.ReqDate ?? line.RequiredDate ?? lineData.ReqDate ?? fallbackRequiredDate ?? "",
    )
      .trim()
      .slice(0, 10);
    // Quoted date = ShipDate only (never invent from required date).
    const quotedDate = String(line.ShipDate ?? lineData.ShipDate ?? "")
      .trim()
      .slice(0, 10);
    return { quantity, requiredQuantity, requiredDate, quotedDate };
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
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const hydratedDocNumRef = useRef<string | null>(null);
  const [hydratedDocNum, setHydratedDocNum] = useState<string | null>(null);
  const requiredDateContainerRef = useRef<HTMLDivElement>(null);

  const editDocNum = (options?.docNum ?? "").trim();
  const draftDocNum = (options?.draftDocNum ?? "").trim();
  const draftDocEntry = (options?.draftDocEntry ?? "").trim();
  const fetchDocNum = isEditMode ? editDocNum : draftDocNum;

  const docDateContainerRef = useRef<HTMLDivElement>(null);
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null);

  const modals = usePqModals();

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

  const setBranchId = useCallback(
    (branchId: number | null) => {
      setHeader({ branchId });
    },
    [setHeader],
  );

  const branchField = useDocumentBranchField({
    warehouses: lookups.warehouses as Array<{
      code: string;
      name?: string;
      branchId?: number | null;
    }>,
    warehouseCode: header.warehouseCode ?? lookups.effectiveWarehouseCode,
    branchId: header.branchId,
    setBranchId,
  });

  const setSeries = useCallback(
    (series: number | null) => {
      setHeader({ series });
    },
    [setHeader],
  );

  const seriesField = useDocumentSeriesField({
    objectCode: SAP_SERIES_OBJECT.purchaseQuotation,
    branchId: header.branchId ?? branchField.effectiveBranchId,
    series: header.series,
    setSeries,
    disabled: isEditMode,
    lockSuggestion: isEditMode,
    documentNumber: isEditMode ? editDocNum : null,
  });

  const productsHook = usePqProducts({
    // Quoted date is left empty on new lines; only required date seeds from header.
    defaultLineQuotedDate: "",
    defaultLineRequiredDate: header.requiredDate || header.docDueDate || "",
    effectiveWarehouseCode: lookups.effectiveWarehouseCode,
    productPopupOpen: modals.productPopupOpen,
    productSearch: modals.productSearch,
    setProductPopupOpen: modals.setProductPopupOpen,
    setProductSearch: modals.setProductSearch,
    stockPreviewProductCode: modals.stockPreviewProduct?.code,
    vendorCardCode: header.vendorCode || lookups.codeInput.trim() || undefined,
    vendorLookupToken: `${lookups.codeInput.trim().toLowerCase()}::${lookups.nameInput.trim().toLowerCase()}`,
    vendorSelected: Boolean(lookups.codeInput || lookups.nameInput),
  });

  // Keep line Required Date in sync with header Required Date when the line is
  // empty or still matching the previous header value. User can override per row;
  // changing the header again re-syncs only non-overridden rows.
  const prevHeaderRequiredDateRef = useRef<string | null>(null);
  useEffect(() => {
    const nextHeaderRequired = (header.requiredDate || "").trim().slice(0, 10);
    const prevHeaderRequired = prevHeaderRequiredDateRef.current;
    prevHeaderRequiredDateRef.current = nextHeaderRequired;

    if (!nextHeaderRequired) {
      return;
    }
    // Skip first paint after hydrate so we don't stomp loaded SAP line dates.
    if (prevHeaderRequired === null) {
      return;
    }
    if (prevHeaderRequired === nextHeaderRequired) {
      return;
    }

    productsHook.setProductRows((prev) =>
      prev.map((row) => {
        const lineReq = (row.requiredDate || "").trim().slice(0, 10);
        const stillMatchesPrevious =
          !lineReq || (prevHeaderRequired !== null && lineReq === prevHeaderRequired);
        if (!stillMatchesPrevious) {
          return row;
        }
        return { ...row, requiredDate: nextHeaderRequired };
      }),
    );
  }, [header.requiredDate, productsHook.setProductRows]);

  useEffect(() => {
    if (!isEditMode && !draftDocNum) {
      resetPQCreate();
      hydratedDocNumRef.current = null;
      setHydratedDocNum(null);
    }
    return () => {
      resetPQCreate();
      lookups.resetWarehouse();
    };
  }, [isEditMode, draftDocNum, resetPQCreate, lookups.resetWarehouse]);

  const editDetailQuery = useQuery({
    ...purchaseQuotationQueries.detailByDocNum(fetchDocNum, isEditMode ? undefined : draftDocEntry),
    enabled: (isEditMode && Boolean(editDocNum)) || Boolean(draftDocNum),
  });

  const isSapClosed =
    editDetailQuery.data?.data?.DocStatus === "Closed" ||
    editDetailQuery.data?.data?.DocStatus === "bost_Close" ||
    editDetailQuery.data?.data?.DocStatus === "C";
  const isRfqLocked = isPqLockedAfterRfqSubmit(editDetailQuery.data?.data?.rfqStatus);
  const isClosed = isSapClosed || isRfqLocked;

  const notifyRestricted = (fieldName = "Field") => {
    if (isRfqLocked) {
      notifyPqRfqLocked();
      return;
    }
    notifyEditRestrictedField(fieldName);
  };

  useEffect(() => {
    if (!isEditMode && !draftDocNum) {
      return;
    }
    const hydrationKey = isEditMode ? editDocNum : `${draftDocNum}_${draftDocEntry ?? ""}`;
    if (!hydrationKey || hydratedDocNumRef.current === hydrationKey) {
      return;
    }
    const detail = editDetailQuery.data?.data;
    if (!detail) {
      return;
    }

    hydratedDocNumRef.current = hydrationKey;

    notifyDocumentHydrating("purchase-quotation", "Loading purchase quotation…");
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
        const headerRequiredDate = String(
          detail.RequriedDate ?? detail.RequiredDate ?? effectiveDocDueDate,
        )
          .trim()
          .slice(0, 10);
        const address = String(detail.Address ?? "").trim();
        const address2 = String((detail as Record<string, unknown>).Address2 ?? "").trim();
        const shipToAddress = address2 ? reconcileAddresses(address, address2) : address;

        const detailLines = detail.DocumentLines ?? [];
        const uniqueItemCodes = [
          ...new Set(detailLines.map((line) => String(line.ItemCode ?? "").trim())),
        ].filter(Boolean);

        // Fast hydrate: OSCN ∩ OITM for document vendor only (no full item master).
        const productByCode = await resolveHydrateProductMeta(
          queryClient,
          uniqueItemCodes,
          "purchase",
          { cardCode: vendorCode || undefined },
        );
        const stockByItemCode = new Map<string, number>();

        const mappedRows = detailLines.map((line: PurchaseQuotationDetailLine, index) => {
          const itemCode = String(line.ItemCode ?? "").trim();
          const productMeta = productByCode.get(itemCode);
          const lineData = line as Record<string, unknown>;
          const { quantity, requiredQuantity, requiredDate, quotedDate } = mapSapLineQtyAndDates(
            line,
            headerRequiredDate || effectiveDocDueDate,
          );
          // OpenQty is the real remaining-fulfillable quantity. Surface it on the
          // row so downstream CopyTo cascades (PO/GRPO/AP Invoice) and any
          // partial-fulfillment UI can consume it. When quoted qty is still 0,
          // fall back to required qty so open qty is not wiped on PQ edit hydrate.
          const sapOpenQty = Number(
            lineData.OpenQty ?? lineData.OpenQuantity ?? lineData.RemainingOpenQuantity ?? 0,
          );
          const openQty =
            Number.isFinite(sapOpenQty) && sapOpenQty > 0
              ? sapOpenQty
              : requiredQuantity > 0
                ? requiredQuantity
                : quantity;
          const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
          const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
            grossAmount: price * quantity,
            headerDiscountPercent: Number((detail as Record<string, unknown>).DiscountPercent ?? 0),
            line: line as Record<string, unknown>,
          });
          return {
            id: `row-${hydrationKey}-${index}`,
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
            uomCode: (() => {
              const code = String(
                lineData.UoMCode ?? lineData.uomCode ?? lineData.UomCode ?? "",
              ).trim();
              if (code) return code;
              const entry = Number(lineData.UoMEntry ?? lineData.uomEntry ?? lineData.UomEntry);
              if (Number.isFinite(entry) && entry > 0) {
                const match = productMeta?.uomList?.find((u) => u.uomEntry === entry);
                if (match?.code) return match.code;
              }
              return String(productMeta?.purchaseUomCode ?? productMeta?.uomCode ?? "").trim();
            })(),
            uomEntry: (() => {
              const entry = Number(lineData.UoMEntry ?? lineData.uomEntry ?? lineData.UomEntry);
              if (Number.isFinite(entry) && entry > 0) return entry;
              const code = String(
                lineData.UoMCode ?? lineData.uomCode ?? lineData.UomCode ?? "",
              ).trim();
              if (code) {
                const match = productMeta?.uomList?.find((u) => u.code === code);
                if (match?.uomEntry !== undefined) return match.uomEntry;
              }
              return productMeta?.purchaseUomEntry ?? productMeta?.uomEntry;
            })(),
            purchaseUomCode: productMeta?.purchaseUomCode,
            purchaseUomEntry: productMeta?.purchaseUomEntry,
            salesUomCode: productMeta?.uomCode,
            salesUomEntry: productMeta?.uomEntry,
            uomList: productMeta?.uomList,
            quantity,
            requiredQuantity,
            discountPercent,
            discountAmount,
            comment: "",
            warehouseCode: String(line.WarehouseCode ?? "").trim(),
            requiredDate,
            quotedDate,
            openQty,
            selected: false,
          };
        });

        setHeader({
          comments,
          docDate: docDate || header.docDate,
          docDueDate,
          requiredDate: headerRequiredDate || effectiveDocDueDate,
          referenceNo,
          series: toPositiveSeries((detail as Record<string, unknown>).Series),
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
        lookups.setShipToAddress(shipToAddress);
        productsHook.setProductRows(mappedRows);
        productsHook.setProductRowDrafts({});

        // Stock is display-only: fill after first paint so edit opens immediately.
        scheduleHydrateWarehouseStocks(queryClient, uniqueItemCodes, warehouseCode, (stocks) => {
          productsHook.setProductRows((prev) =>
            prev.map((row) => {
              const nextStock = stocks.get(row.productCode);
              return nextStock === undefined || nextStock === row.stock
                ? row
                : { ...row, stock: nextStock };
            }),
          );
        });

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
          docDate: docDate,
          docDueDate: docDueDate,
          requiredDate: (headerRequiredDate || effectiveDocDueDate).trim(),
          salesEmployee: associatedSalesEmployeeName.trim(),
          warehouseCode: warehouseCode.trim(),
          billToAddress: address.trim(),
          shipToAddress: shipToAddress.trim(),
          attachments: rawAttachments.map((item: any) => ({
            fileName: item.fileName,
            freeText: item.freeText || item.remarks || "",
          })),
          productRows: mappedRows
            .filter(
              (row) =>
                row.productCode.trim() &&
                (Number(row.requiredQuantity ?? 0) > 0 || row.quantity > 0),
            )
            .map((row) => ({
              productCode: row.productCode,
              quantity: row.quantity,
              requiredQuantity: row.requiredQuantity ?? 0,
              requiredDate: row.requiredDate ?? "",
              quotedDate: row.quotedDate ?? "",
              price: row.price,
              discountPercent: row.discountPercent,
              warehouseCode: row.warehouseCode,
              uomCode: row.uomCode,
              uomEntry: row.uomEntry,
            })),
        });

        hydratedDocNumRef.current = hydrationKey;
        setHydratedDocNum(hydrationKey);
      } finally {
        dismissDocumentHydrating("purchase-quotation");
      }
    })();
  }, [
    queryClient,
    editDetailQuery.data,
    header.docDate,
    isEditMode,
    lookups,
    editDocNum,
    draftDocNum,
    draftDocEntry,
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
          : modals.modalMode === "branch"
            ? branchField.branches
            : modals.modalMode === "series"
              ? seriesField.seriesList
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
    branchField.branches,
    seriesField.seriesList,
    modals.modalSearch,
    modals.modalMode,
  ]);

  const openPopupWithContext = (mode: PopupMode) => {
    modals.openPopup(mode, {
      branchInput: branchField.branchInput,
      codeInput: lookups.codeInput,
      nameInput: lookups.nameInput,
      salesEmployeeInput: lookups.salesEmployeeInput,
      seriesInput: seriesField.seriesInput,
      warehouseInput: lookups.warehouseInput,
    });
  };

  useEffect(() => {
    if (!modals.modalOpen) {
      return;
    }
    const nextSearch = getLookupInlineSearchByMode(modals.modalMode, {
      branch: branchField.branchInput,
      salesEmployee: lookups.salesEmployeeInput,
      series: seriesField.seriesInput,
      vendorCode: lookups.codeInput,
      vendorName: lookups.nameInput,
      warehouse: lookups.warehouseInput,
    });
    if (nextSearch !== modals.modalSearch) {
      modals.setModalSearch(nextSearch);
    }
  }, [
    branchField.branchInput,
    seriesField.seriesInput,
    lookups.codeInput,
    lookups.nameInput,
    lookups.salesEmployeeInput,
    lookups.warehouseInput,
    modals,
  ]);

  const handleLookupModalSearchSync = (mode: PopupMode, value: string) =>
    syncLookupSearchByMode(mode, value, {
      onBranch: branchField.handleBranchChange,
      onSalesEmployee: lookups.handleSalesEmployeeChange,
      onSeries: seriesField.handleSeriesChange,
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
      const insideRequired = requiredDateContainerRef.current?.contains(target);
      if (!insideDoc && !insideDelivery && !insideRequired) {
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
  // Quoted qty is blocked/empty on PQ create UI — validate on required qty instead.
  const validRows = useMemo(
    () =>
      productsHook.productRows.filter((row) => {
        if (!row.productCode.trim()) {
          return false;
        }
        const requiredQty = Number(row.requiredQuantity ?? 0);
        return requiredQty > 0 || row.quantity > 0;
      }),
    [productsHook.productRows],
  );

  const hasValidRowsForCreate = validRows.length > 0;

  const {
    isDirty,
    setFormSnapshot,
    submitDisabled: dirtySubmitDisabled,
  } = useEditDirtyState({
    isEditMode: isEditMode || Boolean(draftDocNum),
    currentFields: useMemo(
      () => ({
        comments: header.comments.trim(),
        referenceNo: header.referenceNo.trim(),
        docDate: header.docDate,
        docDueDate: header.docDueDate,
        requiredDate: header.requiredDate,
        salesEmployee: lookups.salesEmployeeInput.trim(),
        warehouseCode: lookups.effectiveWarehouseCode.trim(),
        billToAddress: lookups.billToAddress.trim(),
        shipToAddress: lookups.shipToAddress.trim(),
        attachments: attachments.map((att) => ({
          fileName: att.fileName,
          freeText: att.freeText || "",
        })),
        productRows: validRows.map((row) => ({
          productCode: row.productCode,
          quantity: row.quantity,
          requiredQuantity: row.requiredQuantity ?? 0,
          requiredDate: row.requiredDate ?? "",
          quotedDate: row.quotedDate ?? "",
          price: row.price,
          discountPercent: row.discountPercent,
          warehouseCode: row.warehouseCode,
          uomCode: row.uomCode,
          uomEntry: row.uomEntry,
        })),
      }),
      [
        header.comments,
        header.referenceNo,
        header.docDate,
        header.docDueDate,
        header.requiredDate,
        lookups.salesEmployeeInput,
        lookups.effectiveWarehouseCode,
        lookups.billToAddress,
        lookups.shipToAddress,
        validRows,
        attachments,
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
    setFormSnapshot(null);
    setAttachments([]);
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
    tableUrl: "/purchase/quotations",
    resetForm,
    getPayloadString: () => {
      const effectiveRequiredDate = getEffectivePurchaseQuotationRequiredDate(
        header.requiredDate,
        header.docDueDate,
        header.docDate,
      );
      const payload = {
        Address: lookups.billToAddress.trim() || undefined,
        Address2: lookups.shipToAddress.trim() || undefined,
        CardCode: (header.vendorCode || lookups.codeInput).trim(),
        ...sapCommentsField(header.comments),
        NumAtCard: header.referenceNo.trim() || undefined,
        DocDate: header.docDate,
        DocDueDate: getEffectivePurchaseQuotationDueDate(header.docDueDate, header.docDate),
        RequriedDate: effectiveRequiredDate,
        DocumentLines: productsHook.productRows.map((row) =>
          mapPqDocumentLine(row, effectiveRequiredDate, lookups.effectiveWarehouseCode.trim()),
        ),
        SalesPersonCode: resolvedSalesEmployeeCode,
        ...documentBranchPayload(header.branchId ?? branchField.effectiveBranchId),
        ...documentSeriesPayload(header.series ?? seriesField.effectiveSeries),
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
    const isDraftAction = action === "draft";
    const draftCardCode = (header.vendorCode || lookups.codeInput).trim();

    if (isClosed && isEditMode) {
      notifyRestricted("Purchase quotation");
      return;
    }

    if (isDraftAction) {
      if (!draftCardCode) {
        setSubmitAttempted(true);
        const nextErrors: ProductSearchFieldError = {
          ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
          vendorCode: "Vendor Code is required.",
          vendorName: "Vendor Name is required.",
        };
        setProductSearchFieldErrors(nextErrors);
        setCreateError("Vendor is required to save as draft.");
        return;
      }
    } else {
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
        return;
      }
    }

    setCreateError(null);

    const loadedDraftDocEntry =
      editDetailQuery.data?.data?.DocEntry ?? editDetailQuery.data?.data?.id;

    const effectiveDocDueDate = getEffectivePurchaseQuotationDueDate(
      header.docDueDate,
      header.docDate,
    );
    const effectiveRequiredDate = getEffectivePurchaseQuotationRequiredDate(
      header.requiredDate,
      header.docDueDate,
      header.docDate,
    );

    const payload = isDraftAction
      ? {
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          CardCode: draftCardCode,
          DocCurrency: resolveDocCurrencyForPayload(
            summaryCurrencyLabel,
            lookups.vendors.find((v) => String(v.code) === String(draftCardCode).trim())?.currency,
          ),
          ...sapCommentsField(header.comments),
          NumAtCard: header.referenceNo.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: effectiveDocDueDate,
          RequriedDate: effectiveRequiredDate,
          DocumentLines: validRows.map((row) =>
            mapPqDocumentLine(row, effectiveRequiredDate, lookups.effectiveWarehouseCode.trim()),
          ),
          SalesPersonCode: resolvedSalesEmployeeCode,
          attachments: attachments.map((att) => ({
            sourcePath: att.sourcePath || "",
            fileName: att.fileName,
            fileExtension: att.fileExtension || "",
            freeText: att.freeText || "",
            attachmentDate: att.attachmentDate || "",
          })),
          isDraft: true,
          ...documentBranchPayload(header.branchId ?? branchField.effectiveBranchId),
          ...documentSeriesPayload(header.series ?? seriesField.effectiveSeries),
        }
      : isEditMode
        ? {
            Address: lookups.billToAddress.trim() || undefined,
            Address2: lookups.shipToAddress.trim() || undefined,
            CardCode: (header.vendorCode || lookups.codeInput).trim() || undefined,
            ...sapCommentsField(header.comments),
            NumAtCard: header.referenceNo.trim() || undefined,
            DocDate: header.docDate,
            DocDueDate: effectiveDocDueDate,
            // When closed, SAP blocks line-level field updates (ShipDate/ReqDate → ODBC -1029).
            // Only send DocumentLines for open documents.
            ...(isClosed
              ? {}
              : {
                  RequriedDate: effectiveRequiredDate,
                  DocumentLines: validRows.map((row) =>
                    mapPqDocumentLine(
                      row,
                      effectiveRequiredDate,
                      lookups.effectiveWarehouseCode.trim(),
                    ),
                  ),
                }),
            SalesPersonCode: resolvedSalesEmployeeCode,
            attachments: attachments.map((att) => ({
              sourcePath: att.sourcePath || "",
              fileName: att.fileName,
              fileExtension: att.fileExtension || "",
              freeText: att.freeText || "",
              attachmentDate: att.attachmentDate || "",
            })),
            ...documentBranchPayload(header.branchId ?? branchField.effectiveBranchId),
          }
        : {
            Address: lookups.billToAddress.trim() || undefined,
            Address2: lookups.shipToAddress.trim() || undefined,
            CardCode: (header.vendorCode || lookups.codeInput).trim(),
            DocCurrency: resolveDocCurrencyForPayload(
              summaryCurrencyLabel,
              lookups.vendors.find(
                (v) => String(v.code) === String(header.vendorCode || lookups.codeInput).trim(),
              )?.currency,
            ),
            ...sapCommentsField(header.comments),
            NumAtCard: header.referenceNo.trim() || undefined,
            DocDate: header.docDate,
            DocDueDate: effectiveDocDueDate,
            RequriedDate: effectiveRequiredDate,
            DocumentLines: validRows.map((row) =>
              mapPqDocumentLine(row, effectiveRequiredDate, lookups.effectiveWarehouseCode.trim()),
            ),
            SalesPersonCode: resolvedSalesEmployeeCode,
            attachments: attachments.map((att) => ({
              sourcePath: att.sourcePath || "",
              fileName: att.fileName,
              fileExtension: att.fileExtension || "",
              freeText: att.freeText || "",
              attachmentDate: att.attachmentDate || "",
            })),
            draftDocEntry: loadedDraftDocEntry ? Number(loadedDraftDocEntry) : undefined,
            ...documentBranchPayload(header.branchId ?? branchField.effectiveBranchId),
            ...documentSeriesPayload(header.series ?? seriesField.effectiveSeries),
          };

    const isDraftUpdate = isDraftAction && loadedDraftDocEntry !== undefined;
    const isUpdating = isEditMode || isDraftUpdate;
    const trackingAction = isDraftUpdate ? "draft-update" : isEditMode ? "update" : action;

    saveActions.startSaveTracking(trackingAction);
    try {
      let createdDocNum: string | number | undefined;

      if (isUpdating) {
        const docEntry = isEditMode
          ? (editDetailQuery.data?.data?.DocEntry ?? editDetailQuery.data?.data?.id)
          : loadedDraftDocEntry;
        if (docEntry === undefined || docEntry === null) {
          setCreateError("Unable to update Purchase Quotation. Document id is missing.");
          return;
        }
        await updatePurchaseQuotationMutation.mutateAsync({
          id: docEntry,
          payload,
        });
        createdDocNum = isEditMode
          ? editDetailQuery.data?.data?.DocNum
          : (editDetailQuery.data?.data?.DocNum ?? draftDocNum);

        // Fetch the updated detail from the API/cache to sync the local states (like attachments) immediately without page refresh.
        // For draft updates, pass DocEntry so ODRF is resolved reliably (not OPQT DocNum collisions).
        const updatedDetailRes = await queryClient.fetchQuery(
          purchaseQuotationQueries.detailByDocNum(
            String(createdDocNum),
            isDraftUpdate ? String(docEntry) : undefined,
          ),
        );
        const updatedDetail = updatedDetailRes?.data;
        if (updatedDetail) {
          const rawAttachments = updatedDetail.attachments || [];
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

          const vendorCode = String(updatedDetail.CardCode ?? "").trim();
          const matchedVendor = lookups.vendors.find(
            (vendor) => String(vendor.code) === vendorCode,
          );
          const warehouseCode = String(
            updatedDetail.DocumentLines?.[0]?.WarehouseCode ?? "",
          ).trim();
          const salesEmployeeNameFromDocCode =
            updatedDetail.SalesPersonCode !== undefined && updatedDetail.SalesPersonCode !== null
              ? lookups.salesEmployees.find(
                  (item) =>
                    normalizeCodeForCompare(item.code) ===
                    normalizeCodeForCompare(updatedDetail.SalesPersonCode),
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

          const { comments, referenceNo } = parsePurchaseQuotationHeaderNotes(updatedDetail);
          const docDate = String(updatedDetail.DocDate ?? "").slice(0, 10);
          const docDueDate = String(updatedDetail.DocDueDate ?? "").slice(0, 10);
          const headerRequiredDate = String(
            updatedDetail.RequriedDate ?? updatedDetail.RequiredDate ?? docDueDate,
          )
            .trim()
            .slice(0, 10);
          const address = String(updatedDetail.Address ?? "").trim();
          const address2 = String((updatedDetail as Record<string, unknown>).Address2 ?? "").trim();
          const shipToAddress = address2 ? reconcileAddresses(address, address2) : address;

          const detailLines = updatedDetail.DocumentLines ?? [];
          const mappedRows = detailLines.map((line: PurchaseQuotationDetailLine, index) => {
            const itemCode = String(line.ItemCode ?? "").trim();
            const lineData = line as Record<string, unknown>;
            const { quantity, requiredQuantity, requiredDate, quotedDate } = mapSapLineQtyAndDates(
              line,
              headerRequiredDate || docDueDate,
            );
            const sapOpenQty = Number(
              lineData.OpenQty ?? lineData.OpenQuantity ?? lineData.RemainingOpenQuantity ?? 0,
            );
            const openQty =
              Number.isFinite(sapOpenQty) && sapOpenQty > 0
                ? sapOpenQty
                : requiredQuantity > 0
                  ? requiredQuantity
                  : quantity;
            const price = Number(line.Price ?? line.UnitPrice ?? 0);
            const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
              grossAmount: price * Math.max(quantity, 0),
              headerDiscountPercent: Number(
                (updatedDetail as Record<string, unknown>).DiscountPercent ?? 0,
              ),
              line: lineData,
            });
            return {
              id: `row-${createdDocNum}-${index}`,
              lineNum: typeof line.LineNum === "number" ? line.LineNum : index,
              productCode: itemCode,
              productName: String(line.ItemDescription ?? "").trim(),
              stock: Number(line.Quantity ?? 0),
              price,
              currency: String(updatedDetail.DocCurr ?? ""),
              vatGroup: String(line.VatGroup ?? line.TaxCode ?? "").trim(),
              taxRate:
                lineData.VatPrcnt !== undefined && lineData.VatPrcnt !== null
                  ? Number(lineData.VatPrcnt)
                  : 0,
              uomCode: String(
                lineData.UoMCode ?? lineData.uomCode ?? lineData.UomCode ?? "",
              ).trim(),
              uomEntry: Number(lineData.UoMEntry ?? lineData.uomEntry ?? lineData.UomEntry),
              quantity,
              requiredQuantity,
              discountPercent,
              discountAmount,
              comment: "",
              warehouseCode: String(line.WarehouseCode ?? "").trim(),
              requiredDate,
              quotedDate,
              openQty,
              selected: false,
            };
          });

          setHeader({
            docDate: docDate || header.docDate,
            docDueDate,
            requiredDate: headerRequiredDate || docDueDate,
          });
          setFormSnapshot({
            comments: comments.trim(),
            referenceNo: referenceNo.trim(),
            docDate: docDate,
            docDueDate: docDueDate,
            requiredDate: (headerRequiredDate || docDueDate).trim(),
            salesEmployee: associatedSalesEmployeeName.trim(),
            warehouseCode: warehouseCode.trim(),
            billToAddress: address.trim(),
            shipToAddress: shipToAddress.trim(),
            attachments: rawAttachments.map((item: any) => ({
              fileName: item.fileName,
              freeText: item.freeText || item.remarks || "",
            })),
            productRows: mappedRows
              .filter(
                (row) =>
                  row.productCode.trim() &&
                  (Number(row.requiredQuantity ?? 0) > 0 || row.quantity > 0),
              )
              .map((row) => ({
                productCode: row.productCode,
                quantity: row.quantity,
                requiredQuantity: row.requiredQuantity ?? 0,
                requiredDate: row.requiredDate ?? "",
                quotedDate: row.quotedDate ?? "",
                price: row.price,
                discountPercent: row.discountPercent,
                warehouseCode: row.warehouseCode,
                uomCode: row.uomCode,
                uomEntry: row.uomEntry,
              })),
          });
        }
      } else {
        const result = await createPurchaseQuotationMutation.mutateAsync({
          payload,
        });
        createdDocNum = (result as { data?: { DocNum?: number } }).data?.DocNum;
      }
      saveActions.trackMutationSuccess();

      // Proactive Cache Revalidation
      void queryClient.invalidateQueries({ queryKey: purchaseQuotationKeys.all });
      void Promise.allSettled([
        queryClient.prefetchQuery(purchaseQuotationQueries.list({ limit: 10, page: 1 })),
        queryClient.prefetchQuery(purchaseQuotationQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(purchaseQuotationQueries.docNumSuggestions(undefined, 100)),
      ]);
      if ((isEditMode || isDraftUpdate) && createdDocNum !== undefined) {
        void queryClient.invalidateQueries(
          purchaseQuotationQueries.detailByDocNum(String(createdDocNum)),
        );
      }

      await saveActions.handleActionSuccess(trackingAction, createdDocNum);

      if (!isEditMode && action === "save-new") {
        options?.onCreateSuccess?.();
      }
    } catch (error) {
      const errorMessage = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isUpdating ? "update" : "create"} Purchase Quotation. Try again.`,
      );
      setCreateError(errorMessage);
      notifyCreateApiError(errorMessage, "purchase-quotation");
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
  const isEditHydrated = isEditMode
    ? Boolean(editDocNum) && hydratedDocNum === editDocNum
    : draftDocNum
      ? Boolean(draftDocNum) && hydratedDocNum === `${draftDocNum}_${draftDocEntry ?? ""}`
      : true;

  const selectBranch = useCallback(
    (item: { code: string; name: string }) => {
      branchField.selectBranch(item);
      modals.setModalOpen(false);
    },
    [branchField, modals],
  );

  const selectSeries = useCallback(
    (item: { code: string; name: string; nextNumber?: number | null | undefined }) => {
      if (isEditMode) {
        notifyRestricted("Series");
        return;
      }
      seriesField.selectSeries(item);
      modals.setModalOpen(false);
    },
    [isEditMode, seriesField, modals],
  );

  return {
    ...lookups,
    ...modals,
    ...productsHook,
    ...branchField,
    ...seriesField,
    selectBranch,
    selectSeries,
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
    requiredDateContainerRef,
    editDetailQuery,
    handleCreateOrder: handleCreateOrderAction,
    handleLookupModalSearchSync,
    header,
    isClosed,
    isSapClosed,
    isRfqLocked,
    isEditHydrated,
    isEditMode,
    isSaved: saveActions.isSaved,
    rfqCopyAllowed: Boolean(editDetailQuery.data?.data?.rfqCopyAllowed),
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
    trackerDocType:
      isEditMode && editDetailQuery.data?.data?.DocStatus !== "Draft"
        ? ("purchase-quotation" as const)
        : null,
    trackerDocEntry:
      isEditMode && editDetailQuery.data?.data?.DocStatus !== "Draft"
        ? (editDetailQuery.data?.data?.DocEntry ?? editDetailQuery.data?.data?.id)
        : null,
    updatePurchaseQuotationMutation,
    isDirty,
    submitDisabled: isEditMode ? dirtySubmitDisabled : false,
    attachments,
    setAttachments,
  };
}
