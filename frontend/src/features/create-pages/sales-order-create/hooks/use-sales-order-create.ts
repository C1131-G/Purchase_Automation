import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { goeyToast } from "goey-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AttachmentItem } from "@/features/create-pages/create-shared/components/grids/upload-grid";

import { formatAddressForDisplay } from "@/features/create-pages/create-shared/utils/address.utils";
import { resolveDocumentLineDiscount } from "@/features/create-pages/create-shared/utils/resolve-document-line-discount";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import {
  getMissingMandatoryCreateFieldsTyped,
  SALES_ORDER_MANDATORY_FIELDS,
} from "@/features/create-pages/create-shared/config/create-mandatory-fields";
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type {
  ActiveDatePicker,
  PopupMode,
  ProductGridRow,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { normalizeCreateOrderErrorMessage } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { formatWarehouseDisplay } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { useDocumentSaveActions } from "@/features/create-pages/create-shared/hooks/use-document-save-actions";
import { pageLoadingToast } from "@/features/create-pages/create-shared/utils/page-loading-toast";
import {
  getLookupInlineSearchByMode,
  syncLookupSearchByMode,
} from "@/features/create-pages/create-shared/utils/lookup-search-sync";
import {
  useCreateSalesOrder,
  useUpdateSalesOrder,
} from "@/features/create-pages/sales-order-create/api/sales-order-create.mutations";
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  FULL_PRODUCT_LIMIT,
  MANDATORY_ERROR_TEXT,
  REQUIRED_FIELD_LABEL_TEXT,
} from "@/features/create-pages/sales-order-create/utils/so-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/sales-order-create/utils/so-create.utils";
import {
  salesOrderKeys,
  salesOrderQueries,
} from "@/features/table-pages/sales-orders/api/sales-order.queries";
import type { SalesOrderDetailLine } from "@/features/table-pages/sales-orders/api/sales-order.service";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import {
  useResetSOCreateAction,
  useSetSOHeaderAction,
  useSOHeader,
} from "@/store/create/so-create.store";

import { useSoLookups } from "./use-so-lookups";
import { useSoModals } from "./use-so-modals";
import { useSoProducts } from "./use-so-products";

type SalesOrderCreateMode = "create" | "edit";

interface UseSalesOrderCreateOptions {
  mode?: SalesOrderCreateMode;
  docNum?: string | undefined;
  sourceDocNum?: string | undefined;
  sourceDocType?: string | undefined;
}

export function useSalesOrderCreate(options?: UseSalesOrderCreateOptions) {
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
  const header = useSOHeader();
  const resetSOCreate = useResetSOCreateAction();
  const setHeader = useSetSOHeaderAction();
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false });
  const sourceDocNum =
    mode === "create" ? (search as Record<string, string | undefined>).sourceDocNum : undefined;
  const sourceDocType =
    mode === "create" ? (search as Record<string, string | undefined>).sourceDocType : undefined;
  const createSalesOrderMutation = useCreateSalesOrder();
  const updateSalesOrderMutation = useUpdateSalesOrder();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null);
  const [pullFromSQModalOpen, setPullFromSQModalOpen] = useState(false);
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

  const modals = useSoModals();

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

  const lookups = useSoLookups({
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

  const productsHook = useSoProducts({
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
    if (!isEditMode) {
      resetSOCreate();
      hydratedDocNumRef.current = null;
    }
    return () => {
      resetSOCreate();
      lookups.resetWarehouse();
    };
  }, [isEditMode, resetSOCreate, lookups.resetWarehouse]);

  const editDetailQuery = useQuery({
    ...salesOrderQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  });
  const sourceDetailQuerySQ = useQuery({
    ...salesQuotationQueries.detailByDocNum(
      (options?.sourceDocNum ?? sourceDocNum ?? "") as string,
    ),
    enabled:
      mode === "create" &&
      (options?.sourceDocType ?? sourceDocType) === "SalesQuotation" &&
      Boolean(options?.sourceDocNum ?? sourceDocNum),
  });

  useEffect(() => {
    if (mode !== "create") {
      return;
    }
    const currentSourceDocNum = options?.sourceDocNum ?? sourceDocNum;
    const currentSourceDocType = options?.sourceDocType ?? sourceDocType;
    if (!currentSourceDocNum || currentSourceDocType !== "SalesQuotation") {
      hydratedDocNumRef.current = null;
      return;
    }

    const detail = sourceDetailQuerySQ.data?.data;
    if (!detail) {
      return;
    }
    if (hydratedDocNumRef.current === `SQ-${currentSourceDocNum}`) {
      return;
    }
    hydratedDocNumRef.current = `SQ-${currentSourceDocNum}`;

    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast("Sales Order", "create");
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
    const referenceNo = String((detail as Record<string, unknown>).NumAtCard ?? "");
    const comments = rawComments || `Based on Sales Quotation ${currentSourceDocNum}`;
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
        const stocksByItemCode = new Map<string, { code: string; stock: number }[]>();
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
            const warehouseStocks = (await queryClient
              .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
              .catch(() => [])) as { code: string; stock: number }[];
            stocksByItemCode.set(itemCode, warehouseStocks);
          }),
        );

        const mappedRows = detailLines.map((line, index) => {
          const itemCode = String(line.ItemCode ?? "").trim();
          const productMeta = productByCode.get(itemCode);
          const lineWarehouse = String(line.WarehouseCode ?? "").trim();

          const warehouseStocks = stocksByItemCode.get(itemCode) ?? [];
          const lineStock = lineWarehouse
            ? Number(
                warehouseStocks.find((s) => String(s.code).trim() === lineWarehouse)?.stock ?? 0,
              )
            : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);

          const quantity = Number(line.RemainingOpenQuantity ?? line.Quantity ?? 1);
          const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0);
          const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
            line: line as Record<string, unknown>,
            grossAmount: price * quantity,
            headerDiscountPercent: Number((detail as any).DiscountPercent ?? 0),
          });
          return {
            baseEntry: detail.DocEntry ?? detail.id,
            baseLine: line.LineNum ?? index,
            baseType: 23, // Sales Quotation
            comment: "",
            currency: String(detail.DocCurr ?? productMeta?.currency ?? ""),
            discountAmount,
            discountPercent,
            id: `row-copy-${currentSourceDocNum}-${index}`,
            price,
            productCode: itemCode,
            productName: String(line.ItemDescription ?? productMeta?.name ?? "").trim(),
            quantity,
            selected: false,
            stock: lineStock,
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
            vatGroup: String(line.VatGroup ?? line.TaxCode ?? productMeta?.vatGroup ?? "").trim(),
            warehouseCode: lineWarehouse,
          };
        });

        setHeader({
          comments,
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

        const sourceAttachments = detail.attachments || [];
        setAttachments(
          sourceAttachments.map((item: any, idx: number) => ({
            id: `copy-${idx}-${item.fileName}`,
            fileName: item.fileName,
            fileExtension: item.fileExtension,
            sourcePath: item.sourcePath,
            attachmentDate: item.attachmentDate,
            freeText: item.freeText || "",
            targetPath: `${item.sourcePath}\\${item.fileName}.${item.fileExtension}`,
          })),
        );

        hydratedDocNumRef.current = `SQ-${currentSourceDocNum}`;
        setHydratedDocNum(`SQ-${currentSourceDocNum}`);
      } finally {
        loadingToastRef.current?.dismiss();
        loadingToastRef.current = null;
      }
    })();
  }, [
    sourceDetailQuerySQ.data,
    mode,
    options?.sourceDocNum,
    sourceDocNum,
    options?.sourceDocType,
    sourceDocType,
    lookups,
    productsHook,
    queryClient,
    setHeader,
  ]);

  // Edit Mode Hydration
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

        // 1. Initial synchronous mapping from document lines (no network requests)
        const initialMappedRows = detailLines.map((line: SalesOrderDetailLine, index) => {
          const itemCode = String(line.ItemCode ?? "").trim();
          const lineWarehouse = String(line.WarehouseCode ?? "").trim();

          const quantity = Number(line.Quantity ?? 1);
          const price = Number(line.Price ?? line.UnitPrice ?? 0);
          const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
            line: line as Record<string, unknown>,
            grossAmount: price * quantity,
            headerDiscountPercent: Number((detail as any).DiscountPercent ?? 0),
          });
          return {
            id: `row-${currentDocNum}-${index}`,
            productCode: itemCode,
            productName: String(line.ItemDescription ?? itemCode).trim(),
            stock: 0,
            price,
            currency: String(detail.DocCurr ?? ""),
            vatGroup: String(line.VatGroup ?? line.TaxCode ?? "").trim(),
            taxRate:
              (line as Record<string, unknown>).VatPrcnt !== undefined &&
              (line as Record<string, unknown>).VatPrcnt !== null
                ? Number((line as Record<string, unknown>).VatPrcnt)
                : 0,
            uomCode: String(
              (line as any).UoMCode ?? (line as any).uomCode ?? (line as any).UomCode ?? "",
            ).trim(),
            uomEntry: Number(
              (line as any).UoMEntry ?? (line as any).uomEntry ?? (line as any).UomEntry,
            ),
            purchaseUomCode: undefined,
            purchaseUomEntry: undefined,
            salesUomCode: undefined,
            salesUomEntry: undefined,
            uomList: undefined,
            quantity,
            discountPercent,
            discountAmount,
            comment: "",
            warehouseCode: lineWarehouse,
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
        productsHook.setProductRows(initialMappedRows);
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
          productRows: initialMappedRows
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

        // 2. Perform network fetches in the background (no await block blocking render!)
        const uniqueItemCodes = [
          ...new Set(detailLines.map((line) => String(line.ItemCode ?? "").trim())),
        ].filter(Boolean);

        const fetchExtraData = async () => {
          try {
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

            const missingItemCodes = uniqueItemCodes.filter(
              (itemCode) => !productByCode.has(itemCode),
            );
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

            // Fetch stocks in parallel
            const stockByItemCode = new Map<string, { code: string; stock: number }[]>();
            await Promise.all(
              uniqueItemCodes.map(async (itemCode) => {
                const warehouseStocks = (await queryClient
                  .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
                  .catch(() => [])) as { code: string; stock: number }[];
                stockByItemCode.set(itemCode, warehouseStocks);
              }),
            );

            // Merge details back into active state in-place
            productsHook.setProductRows((prev) =>
              prev.map((row) => {
                const productMeta = productByCode.get(row.productCode);
                if (!productMeta) {
                  return row;
                }
                const warehouseStocks = stockByItemCode.get(row.productCode) ?? [];
                const stock = row.warehouseCode
                  ? Number(
                      warehouseStocks.find((s) => String(s.code).trim() === row.warehouseCode)
                        ?.stock ?? 0,
                    )
                  : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0);

                return {
                  ...row,
                  stock,
                  currency: row.currency || String(productMeta.currency ?? "").trim(),
                  vatGroup: row.vatGroup || String(productMeta.vatGroup ?? "").trim(),
                  taxRate: row.taxRate > 0 ? row.taxRate : Number(productMeta.taxRate ?? 0),
                  purchaseUomCode: productMeta.purchaseUomCode,
                  purchaseUomEntry: productMeta.purchaseUomEntry,
                  salesUomCode: productMeta.uomCode,
                  salesUomEntry: productMeta.uomEntry,
                  uomList: productMeta.uomList,
                  uomCode: row.uomCode || String(productMeta.uomCode ?? "").trim(),
                  uomEntry: row.uomEntry || productMeta.uomEntry,
                };
              }),
            );
          } catch {
            // Silently ignore background prefetch errors
          }
        };

        void fetchExtraData();
      } catch {
        // error handling
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
    () => getMissingMandatoryCreateFieldsTyped(createMandatoryValues, SALES_ORDER_MANDATORY_FIELDS),
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
        ? `Add at least one product row before ${isEditMode ? "updating" : "creating"} sales order.`
        : null;

  const requiredCompletionPercent =
    ((SALES_ORDER_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      SALES_ORDER_MANDATORY_FIELDS.length) *
    100;

  const requiredFieldsErrorText = `Fill required fields before ${isEditMode ? "updating" : "creating"} sales order.`;
  const rowsErrorText = `Add at least one product row before ${isEditMode ? "updating" : "creating"} sales order.`;
  const warehouseErrorText = "Warehouse must be selected for all product rows.";

  const visibleCreateError =
    createError === requiredFieldsErrorText && !createDisabledReason
      ? null
      : createError === rowsErrorText && hasValidRowsForCreate
        ? null
        : createError === warehouseErrorText && !hasRowsWithoutWarehouse
          ? null
          : createError;

  const resetForm = useCallback(() => {
    resetSOCreate();
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
    setSubmitAttempted(false);
    setHydratedDocNum(null);
    setFormSnapshot(null);
    setAttachments([]);
  }, [resetSOCreate, lookups, modals, productsHook]);

  const saveActions = useDocumentSaveActions({
    documentName: "Sales Order",
    moduleType: "sales",
    defaultUrl: "/sales/create-order",
    resetForm,
    getPayloadString: () => {
      const validRows = productsHook.productRows.filter(
        (row) => row.productCode.trim() && row.quantity > 0,
      );
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
              WarehouseCode:
                row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
              ...(row.baseType !== undefined &&
              row.baseEntry !== undefined &&
              row.baseLine !== undefined
                ? {
                    BaseType: row.baseType,
                    BaseEntry: row.baseEntry,
                    BaseLine: row.baseLine,
                  }
                : {}),
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
              DiscountPercent: row.discountPercent,
              ItemCode: row.productCode,
              Quantity: row.quantity,
              UnitPrice: row.price,
              UoMCode: row.uomCode || undefined,
              UoMEntry: row.uomEntry ?? undefined,
              VatGroup: row.vatGroup || undefined,
              WarehouseCode:
                row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
              ...(row.baseType !== undefined &&
              row.baseEntry !== undefined &&
              row.baseLine !== undefined
                ? {
                    BaseType: row.baseType,
                    BaseEntry: row.baseEntry,
                    BaseLine: row.baseLine,
                  }
                : {}),
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

  const isClosed =
    editDetailQuery.data?.data?.DocStatus === "Closed" ||
    editDetailQuery.data?.data?.DocStatus === "C";

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
            ...(row.baseType !== undefined &&
            row.baseEntry !== undefined &&
            row.baseLine !== undefined
              ? {
                  BaseType: row.baseType,
                  BaseEntry: row.baseEntry,
                  BaseLine: row.baseLine,
                }
              : {}),
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
            DiscountPercent: row.discountPercent,
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            VatGroup: row.vatGroup || undefined,
            WarehouseCode: row.warehouseCode || lookups.effectiveWarehouseCode.trim() || undefined,
            ...(row.baseType !== undefined &&
            row.baseEntry !== undefined &&
            row.baseLine !== undefined
              ? {
                  BaseType: row.baseType,
                  BaseEntry: row.baseEntry,
                  BaseLine: row.baseLine,
                }
              : {}),
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
    saveActions.actionToast.startLoading("Sales Order", isEditMode ? "update" : action);
    try {
      let createdDocNum: string | number | undefined;
      if (isEditMode) {
        const detail = editDetailQuery.data?.data;
        const docEntry = detail?.DocEntry ?? detail?.id;
        if (docEntry === undefined || docEntry === null) {
          setCreateError("Unable to update sales order. Document id is missing.");
          saveActions.actionToast.showError("Sales Order", "update", "Document ID is missing.");
          return;
        }
        await updateSalesOrderMutation.mutateAsync({ id: docEntry, payload });
        createdDocNum = detail?.DocNum;
      } else {
        const result = await createSalesOrderMutation.mutateAsync({ payload });
        createdDocNum = (result as { data?: { DocNum?: number } }).data?.DocNum;
      }

      saveActions.trackMutationSuccess();

      // Proactive Cache Revalidation
      void queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      void Promise.allSettled([
        queryClient.prefetchQuery(salesOrderQueries.list({ limit: 10, page: 1 })),
        queryClient.prefetchQuery(salesOrderQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(salesOrderQueries.docNumSuggestions(undefined, 100)),
      ]);

      if (isEditMode && createdDocNum !== undefined) {
        // Await the query refetch to ensure we have the new server data before clearing hydratedDocNumRef
        await queryClient.invalidateQueries({
          queryKey: salesOrderQueries.detailByDocNum(String(createdDocNum)).queryKey,
        });
        hydratedDocNumRef.current = null;
        setHydratedDocNum(null);
        setFormSnapshot(null);
      }

      await saveActions.handleActionSuccess(isEditMode ? "update" : action, createdDocNum);
    } catch (error) {
      const errorMessage = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isEditMode ? "update" : "create"} sales order. Try again.`,
      );
      saveActions.actionToast.showError(
        "Sales Order",
        isEditMode ? "update" : action,
        errorMessage,
      );
      setCreateError(errorMessage);
    }
  };

  const submitSalesOrderMutation = isEditMode ? updateSalesOrderMutation : createSalesOrderMutation;
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
    allSelectedDocNums?: number[],
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
      const quantity = Number(line.OpenQty ?? line.Quantity ?? 1);
      const { discountPercent, discountAmount } = resolveDocumentLineDiscount({
        line: line as Record<string, unknown>,
        grossAmount: price * quantity,
        headerDiscountPercent: Number((editDetailQuery.data?.data as any)?.DiscountPercent ?? 0),
      });

      return {
        baseEntry: line.DocEntry,
        baseLine: line.LineNum,
        baseType: 23, // Sales Quotation
        comment: `Based on SQ ${line.DocNum}`,
        currency: line.DocCurr || "",
        discountAmount,
        discountPercent,
        id: `sq-pull-${line.DocNum}-${line.LineNum}-${Date.now()}-${index}`,
        price,
        productCode: itemCode,
        productName: line.ItemDescription || "",
        quantity: openQty,
        selected: false,
        stock: lineStock,
        taxRate: line.VatPrcnt ?? 0,
        uomCode: line.UoMCode !== undefined ? String(line.UoMCode) : undefined,
        uomEntry: line.UoMEntry,
        vatGroup: line.TaxCode || line.VatGroup || "",
        warehouseCode: lineWarehouse,
      } as ProductGridRow;
    });

    productsHook.setProductRows((prev) => {
      // 1. Keep non-SQ rows OR SQ rows whose SQ number is in allSelectedDocNums
      const filteredExisting = prev.filter((r) => {
        if (allSelectedDocNums && r.baseType === 23) {
          const match = /Based on SQ (\d+)/.exec(r.comment ?? "");
          if (match?.[1]) {
            const docNum = Number(match[1]);
            return allSelectedDocNums.includes(docNum);
          }
          // Fallback if comment is empty (URL param case)
          const urlDocNum = Number(sourceDocNum);
          if (urlDocNum && !isNaN(urlDocNum)) {
            return allSelectedDocNums.includes(urlDocNum);
          }
        }
        return true;
      });

      // 2. Derive which SQ numbers are already in filteredExisting
      const existingSQDocNums = new Set(
        filteredExisting
          .filter((r) => r.baseType === 23)
          .map((r) => {
            const match = /Based on SQ (\d+)/.exec(r.comment ?? "");
            if (match?.[1]) {
              return Number(match[1]);
            }
            const urlDocNum = Number(sourceDocNum);
            if (urlDocNum && !isNaN(urlDocNum)) {
              return urlDocNum;
            }
            return null;
          })
          .filter(Boolean) as number[],
      );

      // 3. Filter newRows to only include rows from SQ numbers that are NOT already in filteredExisting
      const uniqueNewRows = newRows.filter((row) => {
        const match = /Based on SQ (\d+)/.exec(row.comment ?? "");
        if (match?.[1]) {
          const docNum = Number(match[1]);
          return !existingSQDocNums.has(docNum);
        }
        return true;
      });

      const existingNonEmpty = filteredExisting.filter((r) => r.productCode.trim());
      return [...existingNonEmpty, ...uniqueNewRows];
    });

    // Populate header warehouse from the first pulled line — mirrors the URL-based
    // "copy from Sales Quotation" flow that calls setWarehouseInput at line 305.
    const firstWarehouseCode = newRows[0]?.warehouseCode ?? "";
    if (firstWarehouseCode) {
      const matchedWarehouse = lookups.warehouses.find(
        (w) => String(w.code).trim() === firstWarehouseCode,
      );
      setHeader({ warehouseCode: firstWarehouseCode });
      lookups.setWarehouseInput(
        formatWarehouseDisplay(matchedWarehouse?.name ?? firstWarehouseCode, firstWarehouseCode),
      );
    }

    setPullFromSQModalOpen(false);
  };

  return {
    ...lookups,
    ...modals,
    ...productsHook,
    activeDatePicker,
    pullFromSQModalOpen,
    setPullFromSQModalOpen,
    addProductsFromSQs,
    applyProductToRow: (product: ProductLookupItem) =>
      productsHook.applyProductToRow(product, {
        closeProductPopup: () => modals.setProductPopupOpen(false),
      }),
    applyProductsToRows: (products: ProductLookupItem[]) =>
      productsHook.applyProductsToRows(products, {
        closeProductPopup: () => modals.setProductPopupOpen(false),
      }),
    createDisabledReason,
    submitDisabled,
    createError: visibleCreateError,
    createSalesOrderMutation: submitSalesOrderMutation,
    deliveryDateContainerRef,
    docDateContainerRef,
    editDetailQuery,
    handleCreateOrder: handleCreateOrderAction,
    handleLookupModalSearchSync,
    header,
    isEditHydrated,
    isEditMode,
    isClosed,
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
    submitAttempted,
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
    trackerDocType: isEditMode
      ? "sales-order"
      : sourceDocType === "SalesQuotation"
        ? "sales-quotation"
        : null,
    trackerDocEntry: isEditMode
      ? (editDetailQuery.data?.data?.DocEntry ?? editDetailQuery.data?.data?.id)
      : (sourceDetailQuerySQ.data?.data?.DocEntry ?? sourceDetailQuerySQ.data?.data?.id),
    updateSalesOrderMutation,
    attachments,
    setAttachments,
  };
}
