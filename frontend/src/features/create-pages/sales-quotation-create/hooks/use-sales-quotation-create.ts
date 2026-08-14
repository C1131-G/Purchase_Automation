import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AttachmentItem } from "@/features/create-pages/create-shared/components/grids/upload-grid";

import { formatAddressForDisplay } from "@/features/create-pages/create-shared/utils/address.utils";
import { resolveDocumentLineDiscount } from "@/features/create-pages/create-shared/utils/resolve-document-line-discount";
import {
  resolveHydrateProductMeta,
  scheduleHydrateWarehouseStocks,
} from "@/features/create-pages/create-shared/utils/hydrate-product-meta";
import { sapLotFieldsFromRow } from "@/features/create-pages/create-shared/utils/product-lot-allocations";
import { sapCommentsField } from "@/features/create-pages/create-shared/utils/sap-document-fields";
import { parseDocumentHeaderNotes } from "@/features/create-pages/create-shared/utils/parse-header-notes";
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
  resolveLineUomCode,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import {
  dismissDocumentHydrating,
  notifyCreateApiError,
  notifyDocumentHydrateError,
  notifyDocumentHydrating,
  notifyEditRestrictedField,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import { useDocumentSaveActions } from "@/features/create-pages/create-shared/hooks/use-document-save-actions";
import { useDocumentBranchField } from "@/features/create-pages/create-shared/hooks/use-document-branch-field";
import { documentBranchPayload } from "@/features/create-pages/create-shared/utils/document-branch";
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
  draftDocNum?: string | undefined;
  draftDocEntry?: string | undefined;
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

  const parseSalesQuotationHeaderNotes = parseDocumentHeaderNotes;

  const mode = options?.mode ?? "create";
  const isEditMode = mode === "edit";
  const draftDocNum = options?.draftDocNum ?? "";
  const draftDocEntry = options?.draftDocEntry ?? "";
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

  const editDocNum = (options?.docNum ?? "").trim();

  const docDateContainerRef = useRef<HTMLDivElement>(null);
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null);

  const modals = useSqModals();

  const notifyRestricted = (fieldName = "Field") => {
    notifyEditRestrictedField(fieldName);
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
      // Change line warehouse only — keep mother/sales UoM and other line fields.
      productsHook.setProductRows((prev) =>
        prev.map((row) => ({
          ...row,
          warehouseCode,
          // Explicit preserve: UoM must not reset when WH/branch differs.
          uomCode: row.uomCode,
          uomEntry: row.uomEntry,
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

  const productsHook = useSqProducts({
    customerCardCode: header.vendorCode || lookups.codeInput.trim() || undefined,
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
    setHydratedDocNum(null);
    setFormSnapshot(null);
    setAttachments([]);
  }, [resetSQCreate, lookups, modals, productsHook]);

  const saveActions = useDocumentSaveActions({
    documentName: "Sales Quotation",
    moduleType: "sales",
    defaultUrl: "/sales/create-quotation",
    tableUrl: "/sales/quotations",
    resetForm,
    getPayloadString: () => {
      const payload = {
        Address: lookups.billToAddress.trim() || undefined,
        Address2: lookups.shipToAddress.trim() || undefined,
        CardCode: (header.vendorCode || lookups.codeInput).trim(),
        ...sapCommentsField(header.comments),
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
            ...sapLotFieldsFromRow(row),
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
    isEditMode: isEditMode,
  });

  useEffect(() => {
    if (!isEditMode && !draftDocNum) {
      resetSQCreate();
      hydratedDocNumRef.current = null;
      setHydratedDocNum(null);
    }
    return () => {
      resetSQCreate();
      lookups.resetWarehouse();
    };
  }, [isEditMode, draftDocNum, resetSQCreate, lookups.resetWarehouse]);

  const editDetailQuery = useQuery({
    ...salesQuotationQueries.detailByDocNum(
      isEditMode ? editDocNum : draftDocNum,
      isEditMode ? undefined : draftDocEntry,
    ),
    enabled: (isEditMode && Boolean(editDocNum)) || (!isEditMode && Boolean(draftDocNum)),
  });

  const isClosed =
    editDetailQuery.data?.data?.DocStatus === "Closed" ||
    editDetailQuery.data?.data?.DocStatus === "C";

  useEffect(() => {
    if (!isEditMode && !draftDocNum) {
      return;
    }
    const hydrationKey = isEditMode ? editDocNum : `${draftDocNum}_${draftDocEntry ?? ""}`;
    const currentDocNum = isEditMode ? editDocNum : draftDocNum;
    if (!hydrationKey || hydratedDocNumRef.current === hydrationKey) {
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

    const { comments, referenceNo } = parseSalesQuotationHeaderNotes(detail);

    const docDate = String(detail.DocDate ?? "").slice(0, 10);
    const docDueDate = String(detail.DocDueDate ?? "").slice(0, 10);
    const address = String(
      detail.Address ?? (detail as Record<string, unknown>).address ?? "",
    ).trim();
    const address2 = String(
      (detail as Record<string, unknown>).Address2 ??
        (detail as Record<string, unknown>).address2 ??
        "",
    ).trim();

    notifyDocumentHydrating(
      "sales-quotation",
      isEditMode ? "Loading sales quotation…" : "Loading sales quotation draft…",
    );

    void (async () => {
      try {
        const detailLines = detail.DocumentLines ?? [];
        const uniqueItemCodes = [
          ...new Set(detailLines.map((line) => String(line.ItemCode ?? "").trim())),
        ].filter(Boolean);

        const customerCode = String(detail.CardCode ?? "").trim();
        const productByCode = await resolveHydrateProductMeta(
          queryClient,
          uniqueItemCodes,
          "sales",
          { cardCode: customerCode || undefined },
        );
        const stockByItemCode = new Map<string, number>();

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
              const entry = Number(rawLine.UoMEntry ?? rawLine.uomEntry ?? rawLine.UomEntry);
              return resolveLineUomCode({
                lineUomCode: rawLine.UoMCode ?? rawLine.uomCode ?? rawLine.UomCode,
                lineUomEntry: Number.isFinite(entry) ? entry : undefined,
                product: productMeta
                  ? {
                      purchaseUomCode: productMeta.purchaseUomCode,
                      uomCode: productMeta.uomCode,
                      uomList: productMeta.uomList,
                    }
                  : null,
              });
            })(),
            uomEntry: (() => {
              const rawLine = line as any;
              const entry = Number(rawLine.UoMEntry ?? rawLine.uomEntry ?? rawLine.UomEntry);
              if (Number.isFinite(entry) && entry > 0) return entry;
              const displayCode = resolveLineUomCode({
                lineUomCode: rawLine.UoMCode ?? rawLine.uomCode ?? rawLine.UomCode,
                lineUomEntry: Number.isFinite(entry) ? entry : undefined,
                product: productMeta
                  ? {
                      purchaseUomCode: productMeta.purchaseUomCode,
                      uomCode: productMeta.uomCode,
                      uomList: productMeta.uomList,
                    }
                  : null,
              });
              if (displayCode) {
                const match = productMeta?.uomList?.find((u) => u.code === displayCode);
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
              uomCode: row.uomCode,
              uomEntry: row.uomEntry,
            })),
        });

        hydratedDocNumRef.current = hydrationKey;
        setHydratedDocNum(hydrationKey);
        dismissDocumentHydrating("sales-quotation");
      } catch (error) {
        notifyDocumentHydrateError(
          "sales-quotation",
          error instanceof Error && error.message.trim()
            ? error.message
            : "Could not load the sales quotation.",
        );
      }
    })();
  }, [
    queryClient,
    editDetailQuery.data,
    header.docDate,
    isEditMode,
    draftDocNum,
    draftDocEntry,
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
          : modals.modalMode === "branch"
            ? branchField.branches
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
    modals.modalSearch,
    modals.modalMode,
  ]);

  const openPopupWithContext = (mode: PopupMode) => {
    modals.openPopup(mode, {
      branchInput: branchField.branchInput,
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
      branch: branchField.branchInput,
      salesEmployee: lookups.salesEmployeeInput,
      vendorCode: lookups.codeInput,
      vendorName: lookups.nameInput,
      warehouse: lookups.warehouseInput,
    });
    if (nextSearch !== modals.modalSearch) {
      modals.setModalSearch(nextSearch);
    }
  }, [
    branchField.branchInput,
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
    const isDraftAction = action === "draft";
    const isDraftUpdate = isDraftAction && Boolean(draftDocNum);
    const isUpdating = isEditMode || isDraftUpdate;

    if (isDraftAction && !draftDocNum) {
      // New draft: validate customer is filled, then create draft
      if (!lookups.codeInput.trim() || !lookups.nameInput.trim()) {
        setSubmitAttempted(true);
        const nextErrors = { ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS };
        nextErrors.vendorCode = MANDATORY_ERROR_TEXT.vendorCode;
        nextErrors.vendorName = MANDATORY_ERROR_TEXT.vendorName;
        setProductSearchFieldErrors(nextErrors);
        setCreateError("Customer is required to save as draft.");
        return;
      }
      setSubmitAttempted(true);
      setCreateError(null);
    } else {
      // Non-draft or draft update: run full validation
      if (!isDraftAction) {
        setSubmitAttempted(true);
      }
      const nextErrors: ProductSearchFieldError = {
        ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
      };
      missingMandatoryFields.forEach((field) => {
        const mandatoryKey = field as keyof typeof MANDATORY_ERROR_TEXT;
        nextErrors[field as keyof ProductSearchFieldError] = MANDATORY_ERROR_TEXT[mandatoryKey];
      });

      if (!isDraftAction && Object.values(nextErrors).some(Boolean)) {
        setProductSearchFieldErrors(nextErrors);
        setCreateError(requiredFieldsErrorText);
        return;
      }

      const validRows = productsHook.productRows.filter(
        (row) => row.productCode.trim() && row.quantity > 0,
      );
      if (!isDraftAction && validRows.length === 0) {
        setCreateError(rowsErrorText);
        return;
      }

      if (isEditMode && !isDirty) {
        const noChangeMessage = "Change at least one field before update.";
        setCreateError(noChangeMessage);
        return;
      }

      setCreateError(null);
    }

    const validRows = productsHook.productRows.filter(
      (row) => row.productCode.trim() && row.quantity > 0,
    );

    const buildLines = () =>
      validRows.map((row) => ({
        LineNum: row.lineNum,
        DiscountPercent: row.discountPercent,
        ItemCode: row.productCode,
        Quantity: row.quantity,
        UnitPrice: row.price,
        UoMCode: row.uomCode || undefined,
        UoMEntry: row.uomEntry ?? undefined,
        VatGroup: row.vatGroup || undefined,
        ...sapLotFieldsFromRow(row),
        WarehouseCode: row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
      }));

    const branchFields = documentBranchPayload(header.branchId ?? branchField.effectiveBranchId);
    const headerFields = {
      Address: lookups.billToAddress.trim() || undefined,
      Address2: lookups.shipToAddress.trim() || undefined,
      ...sapCommentsField(header.comments),
      DocDate: header.docDate || undefined,
      DocDueDate: header.docDueDate || undefined,
      NumAtCard: header.referenceNo.trim() || undefined,
      DocumentLines: buildLines(),
      SalesPersonCode: resolvedSalesEmployeeCode,
      attachments: attachments.map((att) => ({
        sourcePath: att.sourcePath || "",
        fileName: att.fileName,
        fileExtension: att.fileExtension || "",
        freeText: att.freeText || "",
        attachmentDate: att.attachmentDate || "",
      })),
      ...branchFields,
    };
    const payload = isUpdating
      ? headerFields
      : {
          ...headerFields,
          CardCode: lookups.codeInput.trim(),
        };

    const trackingAction = isDraftAction
      ? isDraftUpdate
        ? "draft-update"
        : "draft"
      : isEditMode
        ? "update"
        : action;

    saveActions.startSaveTracking(trackingAction);
    try {
      let createdDocNum: string | number | undefined;
      if (isUpdating) {
        const detail = editDetailQuery.data?.data;
        const docEntry = isEditMode
          ? (detail?.DocEntry ?? detail?.id)
          : draftDocEntry
            ? Number(draftDocEntry)
            : undefined;
        if (docEntry === undefined || docEntry === null) {
          setCreateError("Unable to update sales quotation. Document id is missing.");
          return;
        }
        const finalPayload = isDraftAction
          ? { ...payload, isDraft: true, draftDocEntry: Number(draftDocEntry) }
          : payload;
        await updateSalesQuotationMutation.mutateAsync({
          id: docEntry,
          payload: finalPayload,
        });
        createdDocNum = isEditMode ? detail?.DocNum : draftDocNum;

        // Fetch the updated detail from the API/cache to sync the local states (like attachments) immediately without page refresh
        const updatedDetailRes = await queryClient.fetchQuery(
          salesQuotationQueries.detailByDocNum(
            String(createdDocNum),
            isEditMode ? undefined : String(draftDocEntry),
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

          const { comments, referenceNo } = parseSalesQuotationHeaderNotes(updatedDetail);
          const docDueDate = String(updatedDetail.DocDueDate ?? "").slice(0, 10);
          const address = String(
            updatedDetail.Address ?? (updatedDetail as Record<string, unknown>).address ?? "",
          ).trim();
          const address2 = String(
            (updatedDetail as Record<string, unknown>).Address2 ??
              (updatedDetail as Record<string, unknown>).address2 ??
              "",
          ).trim();

          const detailLines = updatedDetail.DocumentLines ?? [];
          const mappedRows = detailLines.map((line: SalesQuotationDetailLine) => {
            const itemCode = String(line.ItemCode ?? "").trim();
            const quantity = Number(line.Quantity ?? 1);
            const price = Number(line.Price ?? line.UnitPrice ?? 0);
            const { discountPercent } = resolveDocumentLineDiscount({
              line: line as Record<string, unknown>,
              grossAmount: price * quantity,
              headerDiscountPercent: Number((updatedDetail as any).DiscountPercent ?? 0),
            });
            const rawLine = line as any;
            const uomCode = String(
              rawLine.UoMCode ?? rawLine.uomCode ?? rawLine.UomCode ?? "",
            ).trim();
            const uomEntry = Number(rawLine.UoMEntry ?? rawLine.uomEntry ?? rawLine.UomEntry);
            return {
              productCode: itemCode,
              quantity,
              price,
              discountPercent,
              warehouseCode: String(line.WarehouseCode ?? "").trim(),
              uomCode: uomCode || undefined,
              uomEntry: Number.isFinite(uomEntry) ? uomEntry : undefined,
            };
          });

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
                uomCode: row.uomCode,
                uomEntry: row.uomEntry,
              })),
          });
        }
      } else {
        const finalCreatePayload = isDraftAction
          ? {
              ...payload,
              isDraft: true,
              ...(draftDocEntry ? { draftDocEntry: Number(draftDocEntry) } : {}),
            }
          : draftDocEntry
            ? { ...payload, draftDocEntry: Number(draftDocEntry) }
            : payload;
        const result = await createSalesQuotationMutation.mutateAsync({
          payload: finalCreatePayload,
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

      if (isUpdating) {
        const currentDocNum = isEditMode ? (options?.docNum ?? "").trim() : draftDocNum;
        if (currentDocNum) {
          void queryClient.invalidateQueries(
            salesQuotationQueries.detailByDocNum(
              currentDocNum,
              isEditMode ? undefined : String(draftDocEntry),
            ),
          );
        }
        lookups.resetWarehouse();
      }

      await saveActions.handleActionSuccess(isEditMode ? "update" : action, createdDocNum);
    } catch (error) {
      const errorMessage = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isEditMode ? "update" : "create"} sales quotation. Try again.`,
      );
      setCreateError(errorMessage);
      notifyCreateApiError(errorMessage, "sales-quotation");
    }
  };

  const submitSalesQuotationMutation = {
    ...createSalesQuotationMutation,
    isPending: createSalesQuotationMutation.isPending || updateSalesQuotationMutation.isPending,
  };
  const isDirty = useMemo(() => {
    const isDraftMode = Boolean(draftDocNum);
    if ((!isEditMode && !isDraftMode) || !formSnapshot) {
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
          uomCode: row.uomCode,
          uomEntry: row.uomEntry,
        })),
    };
    return JSON.stringify(current) !== JSON.stringify(formSnapshot);
  }, [
    isEditMode,
    draftDocNum,
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
  const isEditHydrated = !isEditMode
    ? !draftDocNum || hydratedDocNum === `${draftDocNum}_${draftDocEntry ?? ""}`
    : !editDocNum || hydratedDocNum === editDocNum;

  const selectBranch = useCallback(
    (item: { code: string; name: string }) => {
      branchField.selectBranch(item);
      modals.setModalOpen(false);
    },
    [branchField, modals],
  );

  return {
    ...lookups,
    ...modals,
    ...productsHook,
    ...branchField,
    selectBranch,
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
    isDirty,
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
    draftDocNum,
  };
}
