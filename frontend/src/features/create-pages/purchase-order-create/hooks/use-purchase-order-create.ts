/** usePurchaseOrderCreate: State and logic for creating/updating purchase orders. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { useEffect, useMemo, useRef, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import {
  getMissingMandatoryCreateFieldsTyped,
  PURCHASE_ORDER_MANDATORY_FIELDS,
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
import { documentActionToast } from "@/features/create-pages/create-shared/utils/document-action-toast";
import {
  getLookupInlineSearchByMode,
  syncLookupSearchByMode,
} from "@/features/create-pages/create-shared/utils/lookup-search-sync";
import { pageLoadingToast } from "@/features/create-pages/create-shared/utils/page-loading-toast";
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from "@/features/create-pages/purchase-order-create/api/purchase-order-create.mutations";
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  MANDATORY_ERROR_TEXT,
  REQUIRED_FIELD_LABEL_TEXT,
} from "@/features/create-pages/purchase-order-create/utils/po-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/purchase-order-create/utils/po-create.utils";
import {
  purchaseOrderKeys,
  purchaseOrderQueries,
} from "@/features/table-pages/purchase-orders/api/purchase-order.queries";
import type { PurchaseOrderDetailLine } from "@/features/table-pages/purchase-orders/api/purchase-order.service";
import {
  purchaseQuotationKeys,
  purchaseQuotationQueries,
} from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import {
  usePOHeader,
  useResetPOCreateAction,
  useSetPOHeaderAction,
} from "@/store/create/po-create.store";

import { generateSingleSourceReference } from "../../create-shared/utils/auto-reference";
import { usePoLookups } from "./use-po-lookups";
import { usePoModals } from "./use-po-modals";
import { usePoProducts } from "./use-po-products";

type PurchaseOrderCreateMode = "create" | "edit";

interface UsePurchaseOrderCreateOptions {
  mode?: PurchaseOrderCreateMode;
  docNum?: string;
  sourceDocNum?: string | undefined;
  sourceDocType?: "PurchaseQuotation" | undefined;
  onCreateSuccess?: () => void;
}

export function usePurchaseOrderCreate(options?: UsePurchaseOrderCreateOptions) {
  const sourceDocNum = options?.sourceDocNum;
  const sourceDocType = options?.sourceDocType;
  const [sourceHydrationComplete, setSourceHydrationComplete] = useState(false);
  const normalizeCodeForCompare = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return "";
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase();
  };

  const parsePurchaseOrderHeaderNotes = (detail: { Comments?: unknown; NumAtCard?: unknown }) => {
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

  const mode = options?.mode ?? "create";
  const isEditMode = mode === "edit";
  const header = usePOHeader();
  const resetPOCreate = useResetPOCreateAction();
  const setHeader = useSetPOHeaderAction();
  const queryClient = useQueryClient();
  const createPurchaseOrderMutation = useCreatePurchaseOrder();
  const updatePurchaseOrderMutation = useUpdatePurchaseOrder();

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

  const modals = usePoModals();

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

  const lookups = usePoLookups({
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

  const productsHook = usePoProducts({
    effectiveWarehouseCode: lookups.effectiveWarehouseCode,
    isEditMode,
    productPopupOpen: modals.productPopupOpen,
    productSearch: modals.productSearch,
    setProductPopupOpen: modals.setProductPopupOpen,
    setProductSearch: modals.setProductSearch,
    stockPreviewProductCode: modals.stockPreviewProduct?.code,
    vendorLookupToken: `${lookups.codeInput.trim().toLowerCase()}::${lookups.nameInput.trim().toLowerCase()}`,
    vendorSelected: Boolean(lookups.codeInput || lookups.nameInput),
  });

  useEffect(() => {
    if (isEditMode) {
      return;
    }
    resetPOCreate();
    hydratedDocNumRef.current = null;
  }, [isEditMode, resetPOCreate]);

  const editDetailQuery = useQuery({
    ...purchaseOrderQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
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

    const { comments, referenceNo } = parsePurchaseOrderHeaderNotes(detail);

    const docDate = String(detail.DocDate ?? "").slice(0, 10);
    const docDueDate = String(detail.DocDueDate ?? "").slice(0, 10);
    const billToAddress = String(detail.Address ?? "").trim();
    const shipToAddress = String((detail as Record<string, unknown>).Address2 ?? "").trim();

    // Show loading toast when starting edit hydration
    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast("Purchase Order", "edit");
    }

    void (async () => {
      try {
        const detailLines = detail.DocumentLines ?? [];
        const productsForWarehouse =
          warehouseCode.trim().length > 0
            ? await queryClient
                .fetchQuery(createSharedQueries.products(warehouseCode))
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

        const mappedRows = detailLines.map((line: PurchaseOrderDetailLine, index) => {
          const itemCode = String(line.ItemCode ?? "").trim();
          const productMeta = productByCode.get(itemCode);
          const quantity = Number(line.Quantity ?? 1);
          const openQty = Number(line.OpenQty ?? quantity);
          const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
          const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
            grossAmount: Math.max(0, price * quantity),
            headerDiscountPercent: Number((detail as Record<string, unknown>).DiscountPercent ?? 0),
            line: line as Record<string, unknown>,
          });
          // SAP line VatPrcnt is authoritative; fall back to product master only when missing
          const sapVatPrcnt = Number(line.VatPrcnt ?? 0);

          return {
            comment: "",
            currency: String(detail.DocCurr ?? productMeta?.currency ?? ""),
            discountAmount,
            discountPercent,
            id: `row-${currentDocNum}-${index}`,
            lineNum: typeof line.LineNum === "number" ? line.LineNum : index,
            openQty,
            price,
            productCode: itemCode,
            productName: String(line.ItemDescription ?? productMeta?.name ?? "").trim(),
            quantity,
            selected: false,
            stock: Number(stockByItemCode.get(itemCode) ?? productMeta?.stock ?? 0),
            taxRate: sapVatPrcnt > 0 ? sapVatPrcnt : Number(productMeta?.taxRate ?? 0),
            uomCode: String(line.UoMCode ?? productMeta?.uomCode ?? "").trim(),
            uomEntry:
              typeof line.UoMEntry === "number" && Number.isFinite(line.UoMEntry)
                ? line.UoMEntry
                : productMeta?.uomEntry,
            vatGroup: String(line.TaxCode ?? productMeta?.vatGroup ?? "").trim(),
            warehouseCode: String(line.WarehouseCode ?? "").trim(),
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
        lookups.setBillToAddress(billToAddress);
        lookups.setShipToAddress(shipToAddress);
        productsHook.setProductRows(mappedRows);
        productsHook.setProductRowDrafts({});

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

  // Copy-From Hydration (Purchase Quotation as source)
  useEffect(() => {
    if (isEditMode) {
      return;
    }
    if (!sourceDocNum || !sourceDocType || sourceDocType !== "PurchaseQuotation") {
      return;
    }
    const sourceDocNums = sourceDocNum
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (sourceDocNums.length === 0) {
      return;
    }
    const isMetadataLoaded = lookups.vendors.length > 0 && lookups.salesEmployees.length > 0;
    const hydrationKey = `${sourceDocType}-${sourceDocNum}`;
    if (hydratedDocNumRef.current === hydrationKey && isMetadataLoaded) {
      return;
    }

    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast("Purchase Order", "create");
    }

    const fetchAllSources = async () => {
      try {
        const details = await Promise.all(
          sourceDocNums.map(async (num) => {
            const res = await queryClient.fetchQuery(purchaseQuotationQueries.detailByDocNum(num));
            return res.data;
          }),
        );

        const primaryDetail = details[0]!;
        const vendorCode = String(primaryDetail.CardCode ?? "").trim();
        const vendorName = String(primaryDetail.CardName ?? "").trim();
        const matchedVendor = lookups.vendors.find((v) => String(v.code).trim() === vendorCode);
        const warehouseCode = String(primaryDetail.DocumentLines?.[0]?.WarehouseCode ?? "").trim();
        const matchedWarehouse = lookups.warehouses.find(
          (w) => String(w.code).trim() === warehouseCode,
        );

        const buyerFromDocCode =
          primaryDetail.SalesPersonCode !== undefined && primaryDetail.SalesPersonCode !== null
            ? lookups.salesEmployees.find(
                (item) =>
                  normalizeCodeForCompare(item.code) ===
                  normalizeCodeForCompare(primaryDetail.SalesPersonCode),
              )?.name
            : "";
        const buyerName = buyerFromDocCode || matchedVendor?.salesEmployeeName?.trim() || "";

        const sourceComments = String(primaryDetail.Comments ?? "").trim();
        const refs = sourceDocNums.map((num) => generateSingleSourceReference(sourceDocType, num));
        const autoReference = refs.length === 1 ? refs[0]! : refs.join("\n");
        const commentLines = sourceComments
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const refLinesFromComments = commentLines.filter((line) => /^based on /i.test(line));
        const userRemarks = commentLines
          .filter((line) => !/^based on /i.test(line))
          .join("\n")
          .trim();
        const remarksParts = [refLinesFromComments.join("\n"), autoReference, userRemarks]
          .filter(Boolean)
          .join("\n")
          .trim();

        const sourceNumAtCard = String(
          (primaryDetail as { NumAtCard?: string }).NumAtCard ?? "",
        ).trim();
        const docDueDate = String(primaryDetail.DocDueDate ?? "").slice(0, 10);
        const resolvedHeaderDiscountPercent = Number(
          (primaryDetail as Record<string, unknown>).DiscountPercent ?? 0,
        );

        const baseType = 540000006;
        let lineIndex = 0;
        const mappedRows = details.flatMap((detail, docIdx) => {
          const detailLines = detail.DocumentLines ?? [];
          return detailLines.map((line: PurchaseOrderDetailLine) => {
            const idx = lineIndex++;
            const itemCode = String(line.ItemCode ?? "").trim();
            const lineWarehouseCode = String(line.WarehouseCode ?? "").trim();
            const lineData = line as Record<string, unknown>;
            // For Purchase Quotation sources (baseType 540000006), the user-entered
            // quantity lives in PQT1.PQTReqQty (Service Layer: RequiredQuantity),
            // while PQT1.Quantity stays 0. Prefer RequiredQuantity as a fallback
            // so the copied-to PO receives the same quantity the user requested.
            const openQty = Number(
              (line as { OpenQty?: number }).OpenQty ??
                (line as { RemainingOpenQuantity?: number }).RemainingOpenQuantity ??
                lineData.RequiredQuantity ??
                lineData.requiredQuantity ??
                line.Quantity ??
                1,
            );
            const quantity = openQty;
            const price = Number(line.Price ?? line.UnitPrice ?? 0);
            const grossAmount = Math.max(0, price * quantity);
            const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
              grossAmount,
              headerDiscountPercent: resolvedHeaderDiscountPercent,
              line: line as unknown as Record<string, unknown>,
            });
            const sapVatPrcnt = Number(line.VatPrcnt ?? 0);

            return {
              baseEntry: detail.DocEntry ?? (detail as { id?: number }).id,
              baseLine: line.LineNum ?? idx,
              baseQuantity: quantity,
              baseType,
              comment: "",
              currency: String(primaryDetail.DocCurr ?? ""),
              discountAmount,
              discountPercent,
              id: `row-copy-${sourceDocNums[docIdx] ?? "unknown"}-${idx}`,
              lineNum: typeof line.LineNum === "number" ? line.LineNum : idx,
              openQty,
              price,
              productCode: itemCode,
              productName: String(line.ItemDescription ?? line.ItemCode ?? "").trim(),
              quantity,
              selected: false,
              stock: 0,
              taxRate: sapVatPrcnt > 0 ? sapVatPrcnt : 0,
              uomCode: String(line.UoMCode ?? "").trim(),
              uomEntry:
                typeof line.UoMEntry === "number" && Number.isFinite(line.UoMEntry)
                  ? line.UoMEntry
                  : undefined,
              vatGroup: String(line.VatGroup ?? line.TaxCode ?? "").trim(),
              warehouseCode: lineWarehouseCode,
            };
          });
        });

        setHeader({
          comments: remarksParts,
          docDate: header.docDate,
          docDueDate,
          referenceNo: sourceNumAtCard,
          vendorCode,
          vendorName,
          warehouseCode: matchedWarehouse?.code ?? warehouseCode,
        });
        lookups.setNameInput(vendorName);
        lookups.setCodeInput(vendorCode);
        lookups.setWarehouseInput(
          formatWarehouseDisplay(matchedWarehouse?.name ?? warehouseCode, warehouseCode),
        );
        lookups.setSalesEmployeeInput(buyerName);
        lookups.setBillToAddress(
          String(primaryDetail.Address ?? "").trim() || matchedVendor?.billToAddress || "",
        );
        lookups.setShipToAddress(
          String((primaryDetail as Record<string, unknown>).Address2 ?? "").trim() ||
            matchedVendor?.shipToAddress ||
            matchedVendor?.billToAddress ||
            "",
        );
        productsHook.setProductRows(mappedRows);
        productsHook.setProductRowDrafts({});

        if (isMetadataLoaded) {
          hydratedDocNumRef.current = hydrationKey;
        }
        setSourceHydrationComplete(true);
      } catch (error) {
        goeyToast.error(
          error instanceof Error
            ? error.message
            : "Failed to load Purchase Quotation for copying. Try again.",
          { id: "copy-from-fetch-error-toast" },
        );
      } finally {
        loadingToastRef.current?.dismiss();
        loadingToastRef.current = null;
      }
    };

    void fetchAllSources();
  }, [
    isEditMode,
    sourceDocNum,
    sourceDocType,
    queryClient,
    lookups,
    header.docDate,
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
      vendorCode: lookups.codeInput.trim() || header.vendorCode.trim(),
      vendorName: lookups.nameInput.trim() || header.vendorName.trim(),
      // Check if ANY row has a warehouseCode selected (row-level warehouse)
      warehouseCode: productsHook.productRows.some((row) => row.warehouseCode?.trim())
        ? lookups.effectiveWarehouseCode.trim() || "selected"
        : lookups.effectiveWarehouseCode.trim(),
      docDueDate: header.docDueDate,
      salesEmployee: lookups.salesEmployeeInput.trim(),
      billToAddress: lookups.billToAddress.trim(),
      shipToAddress: lookups.shipToAddress.trim(),
      referenceNo: header.referenceNo.trim(),
      comments: header.comments.trim(),
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
      productsHook.productRows,
    ],
  );

  const missingMandatoryFields = useMemo(() => {
    if (isEditMode) {
      return [];
    }
    return getMissingMandatoryCreateFieldsTyped(
      createMandatoryValues,
      PURCHASE_ORDER_MANDATORY_FIELDS,
    );
  }, [isEditMode, createMandatoryValues]);

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

  const createDisabledReason =
    missingMandatoryFields.length > 0
      ? `Complete required fields: ${missingMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field]).join(", ")}.`
      : !hasValidRowsForCreate
        ? `Add at least one product row before ${isEditMode ? "updating" : "creating"} purchase order.`
        : null;

  const requiredCompletionPercent =
    ((PURCHASE_ORDER_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      PURCHASE_ORDER_MANDATORY_FIELDS.length) *
    100;

  const requiredFieldsErrorText = `Fill required fields before ${isEditMode ? "updating" : "creating"} purchase order.`;
  const rowsErrorText = `Add at least one product row before ${isEditMode ? "updating" : "creating"} purchase order.`;

  const visibleCreateError =
    createError === requiredFieldsErrorText && !createDisabledReason
      ? null
      : createError === rowsErrorText && hasValidRowsForCreate
        ? null
        : createError;

  const warehouseErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!submitAttempted) return errors;

    productsHook.productRows.forEach((row) => {
      if (row.productCode.trim() && !row.warehouseCode.trim()) {
        errors[row.id] = "Warehouse is required.";
      }
    });
    return errors;
  }, [submitAttempted, productsHook.productRows]);

  const handleCreateOrder = async () => {
    setSubmitAttempted(true);
    if (!isEditMode) {
      const nextErrors: ProductSearchFieldError = {
        ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
      };
      missingMandatoryFields.forEach((field) => {
        nextErrors[field] = MANDATORY_ERROR_TEXT[field];
      });

      if (Object.values(nextErrors).some(Boolean)) {
        setProductSearchFieldErrors(nextErrors);
        setCreateError(requiredFieldsErrorText);
        return;
      }
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
      if (detail) {
        const headerDiscountPercent = Number(
          (detail as Record<string, unknown>).DiscountPercent ?? 0,
        );
        const { comments: existingCommentText, referenceNo: existingReferenceNo } =
          parsePurchaseOrderHeaderNotes(detail);

        const existingComparable = {
          Address: String(detail.Address ?? "").trim() || undefined,
          Address2: String((detail as Record<string, unknown>).Address2 ?? "").trim() || undefined,
          Comments: existingCommentText.trim() || undefined,
          NumAtCard: existingReferenceNo.trim() || undefined,
          DocDate: String(detail.DocDate ?? "").slice(0, 10),
          DocDueDate:
            String(detail.DocDueDate ?? "").slice(0, 10) ||
            String(detail.DocDate ?? "").slice(0, 10),
          DocumentLines: (detail.DocumentLines ?? [])
            .filter((line) => Number(line.Quantity ?? 0) > 0)
            .map((line) => {
              const quantity = Number(line.Quantity ?? 0);
              const unitPrice = Number(line.Price ?? line.UnitPrice ?? 0);
              const { discountPercent } = resolveDocumentLineDiscount({
                grossAmount: Math.max(0, unitPrice * quantity),
                headerDiscountPercent,
                line: line as Record<string, unknown>,
              });

              return {
                DiscountPercent: discountPercent,
                ItemCode: String(line.ItemCode ?? "").trim(),
                LineNum: typeof line.LineNum === "number" ? line.LineNum : undefined,
                Quantity: quantity,
                UnitPrice: unitPrice,
                UoMCode: String(line.UoMCode ?? "").trim() || undefined,
                UoMEntry:
                  typeof line.UoMEntry === "number" && Number.isFinite(line.UoMEntry)
                    ? line.UoMEntry
                    : undefined,
                VatGroup: String(line.TaxCode ?? "").trim() || undefined,
                WarehouseCode: String(line.WarehouseCode ?? "").trim() || undefined,
              };
            }),
          SalesPersonCode:
            detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
              ? Number(normalizeCodeForCompare(detail.SalesPersonCode))
              : undefined,
        };

        const currentComparable = {
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          Comments: header.comments.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          DocumentLines: validRows.map((row) => ({
            DiscountPercent: row.discountPercent,
            ItemCode: row.productCode,
            LineNum: row.lineNum,
            Quantity: row.quantity,
            UnitPrice: row.price,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            VatGroup: row.vatGroup || undefined,
            WarehouseCode: row.warehouseCode || undefined,
            BaseType: typeof row.baseType === "number" ? row.baseType : undefined,
            BaseEntry: typeof row.baseEntry === "number" ? row.baseEntry : undefined,
            BaseLine: typeof row.baseLine === "number" ? row.baseLine : undefined,
          })),
          SalesPersonCode: resolvedSalesEmployeeCode,
        };

        if (JSON.stringify(currentComparable) === JSON.stringify(existingComparable)) {
          const noChangeMessage = "Change at least one field before update.";
          setCreateError(noChangeMessage);
          goeyToast.error(noChangeMessage, { id: "no-change-update-toast" });
          return;
        }
      }
    }

    setCreateError(null);

    const payload = isEditMode
      ? {
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          Comments: header.comments.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          NumAtCard: header.referenceNo.trim() || undefined,
          DocumentLines: validRows.map((row) => ({
            DiscountPercent: row.discountPercent,
            ItemCode: row.productCode,
            LineNum: row.lineNum,
            Quantity: row.quantity,
            UnitPrice: row.price,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            VatGroup: row.vatGroup || undefined,
            WarehouseCode: row.warehouseCode || undefined,
            BaseType: typeof row.baseType === "number" ? row.baseType : undefined,
            BaseEntry: typeof row.baseEntry === "number" ? row.baseEntry : undefined,
            BaseLine: typeof row.baseLine === "number" ? row.baseLine : undefined,
          })),
          SalesPersonCode: resolvedSalesEmployeeCode,
        }
      : {
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          CardCode: (header.vendorCode || lookups.codeInput).trim(),
          Comments: header.comments.trim() || undefined,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          NumAtCard: header.referenceNo.trim() || undefined,
          DocumentLines: (() => {
            const lines: Record<string, unknown>[] = [];
            for (const row of validRows) {
              const hasCompleteBaseLink =
                Number.isFinite(row.baseEntry) &&
                Number.isFinite(row.baseLine) &&
                Number.isFinite(row.baseType);

              if (!hasCompleteBaseLink) {
                lines.push({
                  DiscountPercent: row.discountPercent,
                  ItemCode: row.productCode,
                  Quantity: row.quantity,
                  UnitPrice: row.price,
                  UoMCode: row.uomCode || undefined,
                  UoMEntry: row.uomEntry ?? undefined,
                  VatGroup: row.vatGroup || undefined,
                  WarehouseCode: row.warehouseCode || undefined,
                });
                continue;
              }

              const baseQty = row.baseQuantity ?? 0;
              const linkedQty = Math.min(row.quantity, baseQty);

              if (linkedQty > 0) {
                lines.push({
                  BaseEntry: row.baseEntry,
                  BaseLine: row.baseLine,
                  BaseType: row.baseType,
                  DiscountPercent: row.discountPercent,
                  ItemCode: row.productCode,
                  Quantity: linkedQty,
                  UnitPrice: row.price,
                  UoMCode: row.uomCode || undefined,
                  UoMEntry: row.uomEntry ?? undefined,
                  VatGroup: row.vatGroup || undefined,
                  WarehouseCode: row.warehouseCode || undefined,
                });
              }

              const excessQty = row.quantity - baseQty;
              if (excessQty > 0) {
                lines.push({
                  DiscountPercent: row.discountPercent,
                  ItemCode: row.productCode,
                  Quantity: excessQty,
                  UnitPrice: row.price,
                  UoMCode: row.uomCode || undefined,
                  UoMEntry: row.uomEntry ?? undefined,
                  VatGroup: row.vatGroup || undefined,
                  WarehouseCode: row.warehouseCode || undefined,
                });
              }
            }
            return lines;
          })(),
          SalesPersonCode: resolvedSalesEmployeeCode,
        };

    const toastHandle = documentActionToast("Purchase Order", isEditMode ? "update" : "create");

    try {
      let createdDocNum: number | undefined;
      if (isEditMode) {
        const detail = editDetailQuery.data?.data;
        const docEntry = detail?.DocEntry ?? detail?.id;
        if (docEntry === undefined || docEntry === null) {
          setCreateError("Unable to update purchase order. Document id is missing.");
          toastHandle.error();
          return;
        }
        await updatePurchaseOrderMutation.mutateAsync({
          id: docEntry,
          payload,
        });
      } else {
        const result = await createPurchaseOrderMutation.mutateAsync({
          payload,
        });
        createdDocNum = result?.data?.DocNum;
      }
      toastHandle.success(createdDocNum);

      // Proactive Cache Revalidation
      void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
      void Promise.allSettled([
        queryClient.prefetchQuery(purchaseOrderQueries.list({ limit: 10, page: 1 })),
        queryClient.prefetchQuery(purchaseOrderQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(purchaseOrderQueries.docNumSuggestions(undefined, 100)),
      ]);

      // Invalidate specific PurchaseQuotation detail and list queries used by copy-from hydration
      if (sourceDocNum && sourceDocType === "PurchaseQuotation") {
        sourceDocNum.split(",").forEach((num) => {
          const trimmed = num.trim();
          if (trimmed) {
            void queryClient.invalidateQueries({
              queryKey: purchaseQuotationQueries.detailByDocNum(trimmed).queryKey,
            });
          }
        });
        void queryClient.invalidateQueries({ queryKey: purchaseQuotationKeys.all });
      }

      if (isEditMode) {
        const currentDocNum = (options?.docNum ?? "").trim();
        if (currentDocNum) {
          void queryClient.prefetchQuery(purchaseOrderQueries.detailByDocNum(currentDocNum));
        }
        window.scrollTo({ behavior: "smooth", top: 0 });
        setSubmitAttempted(false);
        lookups.setWarehouseInput("");
        setHeader({ warehouseCode: "" });
        return;
      }

      resetPOCreate();
      setSubmitAttempted(false);
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
      hydratedDocNumRef.current = null;
      setHydratedDocNum(null);

      // Scroll to top after successful save
      window.scrollTo({ behavior: "smooth", top: 0 });

      // Notify parent to navigate away after successful create
      if (!isEditMode) {
        options?.onCreateSuccess?.();
      }
    } catch (error) {
      toastHandle.error();
      const errorMsg = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isEditMode ? "update" : "create"} purchase order. Try again.`,
      );
      setCreateError(errorMsg);
    }
  };

  const submitPurchaseOrderMutation = isEditMode
    ? updatePurchaseOrderMutation
    : createPurchaseOrderMutation;

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
  const isSourceHydrating =
    !isEditMode &&
    Boolean(sourceDocNum) &&
    sourceDocType === "PurchaseQuotation" &&
    !sourceHydrationComplete;

  // Derive the product code of the currently active row for seeding modal selection
  const activeRowProductCode = useMemo(() => {
    if (!productsHook.activeProductRowId) {
      return null;
    }
    const activeRow = productsHook.productRows.find(
      (r) => r.id === productsHook.activeProductRowId,
    );
    return activeRow?.productCode ?? null;
  }, [productsHook.activeProductRowId, productsHook.productRows]);

  return {
    ...lookups,
    ...modals,
    ...productsHook,
    activeDatePicker,
    activeRowProductCode,
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
    createPurchaseOrderMutation: submitPurchaseOrderMutation,
    deliveryDateContainerRef,
    docDateContainerRef,
    docStatus:
      editDetailQuery.data?.data?.DocStatus === "O"
        ? "Open"
        : editDetailQuery.data?.data?.DocStatus === "C"
          ? "Closed"
          : (editDetailQuery.data?.data?.DocStatus ?? "Open"),
    editDetailQuery,
    handleCreateOrder,
    handleLookupModalSearchSync,
    header,
    isClosed:
      editDetailQuery.data?.data?.DocStatus === "Closed" ||
      editDetailQuery.data?.data?.DocStatus === "C",
    isEditHydrated,
    isEditMode,
    isSourceHydrating,
    missingMandatoryFields,
    missingSearchMandatoryFields,
    openPopup: openPopupWithContext,
    openProductPopup: handleOpenProductPopup,
    popupResults,
    productSearchFieldErrors,
    requiredCompletionPercent,
    searchMandatoryFields,
    searchRequiredCompletionPercent,
    setActiveDatePicker,
    setHeader,
    setProductSearchFieldErrors,
    showEditRestrictedToast: (fieldName = "Field") => notifyRestricted(fieldName),
    summaryCurrencyLabel,
    today,
    totals,
    updatePurchaseOrderMutation,
  };
}
