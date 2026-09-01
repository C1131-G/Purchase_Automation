import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import {
  dismissDocumentHydrating,
  notifyActionError,
  notifyActionSuccess,
  notifyCreateApiError,
  notifyDocumentHydrating,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import type {
  CreateLookupOption,
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { useDocumentBranchField } from "@/features/create-pages/create-shared/hooks/use-document-branch-field";
import {
  toPositiveBranchId,
  type WarehouseWithBranch,
} from "@/features/create-pages/create-shared/utils/document-branch";
import {
  capIsoDateToMax,
  formatWarehouseDisplay,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import { filterLocationLookupOptions } from "@/features/create-pages/create-shared/utils/location-lookup";
import { capQuantityToMax } from "@/features/create-pages/create-shared/utils/document-line-quantity";
import { rankAndLimitLookupOptions } from "@/features/create-pages/create-shared/utils/rank-lookup-options";
import {
  useConvertIcRfq,
  useSubmitIcRfq,
  useUpdateIcRfq,
} from "@/features/intercompany/api/intercompany.mutations";
import { useIcRfq } from "@/features/intercompany/api/intercompany.queries";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

import {
  applyRfqQuotedQtyCap,
  applyRfqSalesTaxToRows,
  buildUpdateRfqLinesPayloadFromProductRows,
  computeRfqProductTotals,
  getRfqLineFieldErrors,
  getRfqBatchQuotedDate,
  canEditRfqLines,
  isRfqCompleted,
  isRfqDraft,
  isRfqSubmitted,
  mapRfqLinesToProductRows,
  normalizeRfqQuotedDate,
  productRowsFingerprint,
  type RfqLineFieldErrors,
  type RfqSellerProductPatch,
} from "../utils/rfq-form.utils";

const EMPTY_TAX_CODES: CreateLookupOption[] = [];

export function useRequestForQuotationForm(rfqId: number) {
  const detailQuery = useIcRfq(rfqId, Number.isFinite(rfqId) && rfqId > 0);
  const header = detailQuery.data?.data;

  // Seller company masters — RFQ warehouse/branch are seller-side (OSCN.U_Warehouse).
  const warehousesQuery = useQuery(createSharedQueries.warehouses());
  const taxCodesQuery = useQuery(createSharedQueries.taxCodes());
  const taxCodes = taxCodesQuery.data ?? EMPTY_TAX_CODES;
  const warehouses = useMemo(
    () =>
      ((warehousesQuery.data ?? []) as WarehouseWithBranch[]).map((item) => ({
        ...item,
        name: item.name?.trim() || item.code,
      })),
    [warehousesQuery.data],
  );

  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({});
  const [hydratedKey, setHydratedKey] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  /** After submit click: show red borders on missing quote fields (no letter). */
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const requiredQtyByIdRef = useRef<Record<string, number>>({});
  const lastBatchQuotedDateRef = useRef<string | null>(null);
  /** Header-level Quoted Date display (Document Dates) — batch-fills all lines. */
  const [batchQuotedDate, setBatchQuotedDate] = useState("");
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseInput, setWarehouseInput] = useState("");
  const [warehouseFocused, setWarehouseFocused] = useState(false);
  const warehouseDirtyRef = useRef(false);
  const [headerBranchId, setHeaderBranchId] = useState<number | null>(null);
  const [removedLineNums, setRemovedLineNums] = useState<number[]>([]);

  const submitMutation = useSubmitIcRfq();
  const updateMutation = useUpdateIcRfq();
  const convertMutation = useConvertIcRfq();

  // Loading toast only during initial hydrate (once per doc), like SQ/PO/GRPO.
  // Background refetches (`isFetching`) must NOT re-show it.
  const hydratingDocRef = useRef(false);
  useEffect(() => {
    if (detailQuery.isLoading) {
      hydratingDocRef.current = true;
      notifyDocumentHydrating("request-for-quotation", "Loading request for quotation…");
      return;
    }
    if (!detailQuery.isPending && hydratingDocRef.current) {
      hydratingDocRef.current = false;
      dismissDocumentHydrating("request-for-quotation");
    }
  }, [detailQuery.isLoading, detailQuery.isPending]);

  const canEditLines = canEditRfqLines(header?.status, header?.pqCopiedToPo);
  const canRemoveRows = isRfqDraft(header?.status);
  const canSubmit = isRfqDraft(header?.status);
  const canUpdate = isRfqCompleted(header?.status) && header?.pqCopiedToPo !== true;
  const canConvert = isRfqSubmitted(header?.status);

  const lineFieldErrors: RfqLineFieldErrors = useMemo(
    () => (submitAttempted ? getRfqLineFieldErrors(productRows) : {}),
    [productRows, submitAttempted],
  );

  // Re-hydrate product rows when server detail changes.
  useEffect(() => {
    if (!header) {
      return;
    }
    const fingerprint = [
      header.rfqId,
      header.status,
      header.customerCode ?? "",
      header.customerName ?? "",
      header.sourceCompanyName ?? "",
      header.buyerName ?? "",
      header.docDate ?? "",
      header.docDueDate ?? "",
      header.requiredDate ?? "",
      header.billToAddress ?? "",
      header.shipToAddress ?? "",
      ...(header.lines ?? []).map(
        (line) =>
          `${line.rfqLineId}:${line.itemCode}:${line.description ?? ""}:${line.unitPrice ?? ""}:${line.quantity ?? ""}:${line.requiredQuantity ?? ""}:${line.requiredDate ?? ""}:${line.discount ?? ""}:${line.deliveryDate ?? ""}:${line.warehouse ?? ""}`,
      ),
    ].join("|");

    if (fingerprint === hydratedKey) {
      return;
    }

    const todayIso = toISODate(new Date());
    const docDueDate = (header.docDueDate ?? "").trim().slice(0, 10);
    const defaultQuotedDate = docDueDate ? capIsoDateToMax(todayIso, docDueDate) : todayIso;
    const rows = applyRfqSalesTaxToRows(
      mapRfqLinesToProductRows(header.lines, defaultQuotedDate, todayIso, docDueDate),
      taxCodes,
    );
    const requiredMap: Record<string, number> = {};
    for (const row of rows) {
      // Buyer required qty only — never seed from quoted qty.
      requiredMap[row.id] = row.requiredQuantity ?? 0;
    }
    requiredQtyByIdRef.current = requiredMap;
    setProductRows(rows);
    setProductRowDrafts({});
    setRemovedLineNums([]);
    const serverWarehouse =
      header.warehouseCode?.trim() ||
      rows.find((row) => row.warehouseCode?.trim())?.warehouseCode?.trim() ||
      "";
    setWarehouseCode(serverWarehouse);
    warehouseDirtyRef.current = false;
    setWarehouseFocused(false);
    const initialBatchDate = getRfqBatchQuotedDate(rows);
    lastBatchQuotedDateRef.current = initialBatchDate;
    setBatchQuotedDate(initialBatchDate);
    setHydratedKey(fingerprint);
    setFormError(null);
    setSubmitAttempted(false);
  }, [header, hydratedKey, taxCodes]);

  // Tax codes often arrive after first hydrate — fill sales rate on every row
  // so Tax Total / Grand Total include tax (virtualized rows never mount).
  useEffect(() => {
    if (taxCodes.length === 0) {
      return;
    }
    setProductRows((prev) => applyRfqSalesTaxToRows(prev, taxCodes));
  }, [taxCodes]);

  const totals = useMemo(() => computeRfqProductTotals(productRows), [productRows]);

  const isDirty = useMemo(() => {
    if (!header?.lines) {
      return productRows.length > 0;
    }
    const todayIso = toISODate(new Date());
    const docDueDate = (header.docDueDate ?? "").trim().slice(0, 10);
    const defaultQuotedDate = docDueDate ? capIsoDateToMax(todayIso, docDueDate) : todayIso;
    const server = mapRfqLinesToProductRows(header.lines, defaultQuotedDate, todayIso, docDueDate);
    const serverWarehouse =
      header.warehouseCode?.trim() ||
      server.find((row) => row.warehouseCode?.trim())?.warehouseCode?.trim() ||
      "";
    return (
      productRowsFingerprint(server) !== productRowsFingerprint(productRows) ||
      serverWarehouse !== warehouseCode.trim()
    );
  }, [header?.docDueDate, header?.lines, header?.warehouseCode, productRows, warehouseCode]);

  const updateProductRow = useCallback(
    (id: string, patch: Partial<ProductRow>) => {
      // taxRate / vatGroup from OVTG are display-only (sales-side remap) and apply on submitted RFQs too.
      const allowed: Partial<RfqSellerProductPatch> = {};
      if (patch.taxRate !== undefined) {
        allowed.taxRate = patch.taxRate;
      }
      if (patch.vatGroup !== undefined) {
        allowed.vatGroup = patch.vatGroup;
      }
      if (canEditLines) {
        if (patch.price !== undefined) {
          allowed.price = patch.price;
        }
        if (patch.quantity !== undefined) {
          allowed.quantity = capQuantityToMax(patch.quantity, requiredQtyByIdRef.current[id]);
        }
        if (patch.discountPercent !== undefined) {
          allowed.discountPercent = patch.discountPercent;
        }
        if (patch.discountAmount !== undefined) {
          allowed.discountAmount = patch.discountAmount;
        }
        if (patch.quotedDate !== undefined) {
          const docDueDate = (header?.docDueDate ?? "").trim().slice(0, 10);
          allowed.quotedDate = normalizeRfqQuotedDate(
            patch.quotedDate,
            toISODate(new Date()),
            docDueDate,
          );
        }
      }
      if (Object.keys(allowed).length === 0) {
        return;
      }
      setProductRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) {
            return row;
          }
          return {
            ...row,
            ...allowed,
            // Keep buyer required qty snapshot locked.
            requiredQuantity: requiredQtyByIdRef.current[id] ?? row.requiredQuantity,
          };
        }),
      );
      if (canEditLines) {
        setFormError(null);
      }
    },
    [canEditLines, header?.docDueDate],
  );

  const setProductRowDraft = useCallback(
    (id: string, field: keyof ProductRowDraft, value: string) => {
      if (!canEditLines) {
        return;
      }
      setProductRowDrafts((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: value,
        },
      }));
    },
    [canEditLines],
  );

  const clearProductRowDraft = useCallback((id: string, field: keyof ProductRowDraft) => {
    setProductRowDrafts((prev) => {
      const current = prev[id];
      if (!current || current[field] === undefined) {
        return prev;
      }
      const next = { ...current };
      delete next[field];
      if (Object.keys(next).length === 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const removeProductRow = useCallback(
    (id: string) => {
      if (!isRfqDraft(header?.status) || productRows.length <= 1) {
        return;
      }
      const row = productRows.find((candidate) => candidate.id === id);
      if (!row || row.lineNum == null) {
        return;
      }
      const lineNum = row.lineNum;
      setProductRows((previous) => previous.filter((candidate) => candidate.id !== id));
      setProductRowDrafts((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      setRemovedLineNums((previous) =>
        previous.includes(lineNum) ? previous : [...previous, lineNum],
      );
      setFormError(null);
    },
    [header?.status, productRows],
  );

  /**
   * Batch fill Quoted Date from the product-section header control.
   * The header is an explicit batch control and applies to every row.
   */
  const setAllQuotedDate = useCallback(
    (value: string) => {
      if (!canEditLines) {
        return;
      }
      const rawDate = value.trim().slice(0, 10);
      if (!rawDate) {
        return;
      }
      const docDueDate = (header?.docDueDate ?? "").trim().slice(0, 10);
      const nextDate = normalizeRfqQuotedDate(rawDate, toISODate(new Date()), docDueDate);
      lastBatchQuotedDateRef.current = nextDate;
      setBatchQuotedDate(nextDate);
      setProductRows((prev) => prev.map((row) => ({ ...row, quotedDate: nextDate })));
      setFormError(null);
    },
    [canEditLines, header?.docDueDate],
  );

  const openProductPopup = useCallback((_rowId: string | null) => {
    // Product search locked on RFQ seller fill.
  }, []);

  const prefetchProducts = useCallback(() => {
    // no-op
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!header || !canSubmit) {
      return;
    }

    setSubmitAttempted(true);
    setFormError(null);

    const rowsForSave = applyRfqQuotedQtyCap(productRows, productRowDrafts);
    const { errors, lines: payloadLines } = buildUpdateRfqLinesPayloadFromProductRows(rowsForSave, {
      requireAllPrices: true,
    });
    if (errors.length > 0 || payloadLines.length === 0) {
      // Missing quote fields: red borders only (same idea as vendor name/code).
      return;
    }

    try {
      // Single request: save lines (if any) + mark SUBMITTED. Notify + PQ/SQ convert
      // run server-side in background — do not PUT then POST.
      const submitted = await submitMutation.mutateAsync({
        rfqId: header.rfqId,
        body: {
          lines: payloadLines,
          removedLineNums: removedLineNums.length > 0 ? removedLineNums : undefined,
          warehouse: warehouseCode.trim() || null,
        },
      });
      const status = String(submitted.data?.status ?? "").toUpperCase();
      notifyActionSuccess(
        status === "COMPLETED"
          ? "RFQ submitted and converted (PQ + SQ)"
          : "RFQ submitted — PQ + SQ converting in background",
        "rfq-submit",
      );
      setFormError(null);
      setSubmitAttempted(false);
    } catch (error) {
      const message = toSafeErrorMessage(
        error instanceof Error ? error.message : undefined,
        "Could not submit Request For Quotation.",
      );
      setFormError(message);
      notifyCreateApiError(message, "rfq");
    }
  }, [
    canSubmit,
    header,
    productRowDrafts,
    productRows,
    removedLineNums,
    submitMutation,
    warehouseCode,
  ]);

  const handleUpdate = useCallback(async () => {
    if (!header || !canUpdate) {
      return;
    }

    setSubmitAttempted(true);
    setFormError(null);

    const rowsForSave = applyRfqQuotedQtyCap(productRows, productRowDrafts);
    const { errors, lines: payloadLines } = buildUpdateRfqLinesPayloadFromProductRows(rowsForSave, {
      requireAllPrices: true,
    });
    if (errors.length > 0 || payloadLines.length === 0) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        rfqId: header.rfqId,
        body: {
          lines: payloadLines,
          removedLineNums: removedLineNums.length > 0 ? removedLineNums : undefined,
          warehouse: warehouseCode.trim() || null,
        },
      });
      notifyActionSuccess(
        "RFQ updated — purchase quotation and sales quotation synced",
        "rfq-update",
      );
      setFormError(null);
      setSubmitAttempted(false);
    } catch (error) {
      const message = toSafeErrorMessage(
        error instanceof Error ? error.message : undefined,
        "Could not update Request For Quotation.",
      );
      setFormError(message);
      notifyCreateApiError(message, "rfq");
    }
  }, [
    canUpdate,
    header,
    productRowDrafts,
    productRows,
    removedLineNums,
    updateMutation,
    warehouseCode,
  ]);

  const handleConvert = useCallback(async () => {
    if (!header || !canConvert) {
      return;
    }
    try {
      const result = await convertMutation.mutateAsync(header.rfqId);
      const status = result.data.status;
      if (status === "success") {
        const docNum = result.data.targetDoc?.num;
        notifyActionSuccess(
          docNum != null
            ? `Converted to Purchase Quotation ${docNum}`
            : "Request For Quotation converted",
          "rfq-convert",
        );
      } else if (status === "queued_retry") {
        notifyActionSuccess("Convert queued for retry", "rfq-convert");
      } else if (status === "failed") {
        notifyActionError(result.data.message, "Convert failed", "rfq-convert");
      } else {
        notifyActionSuccess(`Convert ${status}`, "rfq-convert");
      }
      setFormError(null);
    } catch (error) {
      const message = toSafeErrorMessage(
        error instanceof Error ? error.message : undefined,
        "Could not convert Request For Quotation.",
      );
      setFormError(message);
      notifyCreateApiError(message, "rfq");
    }
  }, [canConvert, convertMutation, header]);

  const isSubmitting =
    submitMutation.isPending || updateMutation.isPending || convertMutation.isPending;

  const defaultWarehouseCode = warehouseCode.trim();

  const applyWarehouse = useCallback((code: string, display?: string) => {
    warehouseDirtyRef.current = false;
    const next = code.trim();
    setWarehouseCode(next);
    if (display !== undefined) {
      setWarehouseInput(display);
    }
    setWarehouseFocused(false);
    setProductRows((prev) => prev.map((row) => ({ ...row, warehouseCode: next })));
    setFormError(null);
  }, []);

  const selectWarehouse = useCallback(
    (item: { code: string; name: string }) => {
      applyWarehouse(item.code, formatWarehouseDisplay(item.name, item.code));
    },
    [applyWarehouse],
  );

  const handleWarehouseChange = useCallback(
    (value: string) => {
      if (!canEditLines) {
        return;
      }
      warehouseDirtyRef.current = true;
      setWarehouseInput(value);
      if (!value.trim()) {
        applyWarehouse("");
        setWarehouseFocused(true);
        return;
      }
      setWarehouseCode("");
      setWarehouseFocused(true);
    },
    [applyWarehouse, canEditLines],
  );

  useEffect(() => {
    if (
      warehouseDirtyRef.current ||
      !warehouseCode ||
      warehouses.length === 0 ||
      warehouseFocused
    ) {
      return;
    }
    const matched = warehouses.find((item) => String(item.code).trim() === warehouseCode);
    const display = matched
      ? formatWarehouseDisplay(matched.name ?? "", matched.code)
      : warehouseCode;
    if (warehouseInput !== display) {
      setWarehouseInput(display);
    }
  }, [warehouseCode, warehouseFocused, warehouseInput, warehouses]);

  const warehouseSuggestions = useMemo(
    () =>
      rankAndLimitLookupOptions(
        filterLocationLookupOptions(warehouses, warehouseInput),
        warehouseInput,
      ),
    [warehouseInput, warehouses],
  );

  const branchField = useDocumentBranchField({
    branchId: headerBranchId,
    disabled: !canEditLines,
    setBranchId: setHeaderBranchId,
    warehouseCode,
    warehouses,
  });

  const selectBranch = useCallback(
    (item: { code: string; name: string }) => {
      if (!canEditLines) {
        return;
      }
      branchField.selectBranch(item);
      const branchId = toPositiveBranchId(item.code);
      if (branchId == null) {
        return;
      }
      const currentOk = warehouses.some(
        (wh) =>
          String(wh.code).trim() === warehouseCode && toPositiveBranchId(wh.branchId) === branchId,
      );
      if (currentOk) {
        return;
      }
      const firstOnBranch = warehouses.find((wh) => toPositiveBranchId(wh.branchId) === branchId);
      if (firstOnBranch) {
        selectWarehouse(firstOnBranch);
      }
    },
    [branchField, canEditLines, selectWarehouse, warehouseCode, warehouses],
  );

  const finalizeWarehouseInput = useCallback(() => {
    if (!warehouseCode) {
      setWarehouseInput("");
    }
    setWarehouseFocused(false);
  }, [warehouseCode]);

  return {
    batchQuotedDate,
    branchDisabled: branchField.branchDisabled || !canEditLines,
    branchFocused: branchField.branchFocused,
    branchId: branchField.effectiveBranchId,
    branchInput: branchField.branchInput,
    branchPlaceholder: branchField.branchPlaceholder,
    branchSuggestions: branchField.branchSuggestions,
    finalizeBranchInput: branchField.finalizeBranchInput,
    branchesLoading: branchField.branchesQuery.isLoading || warehousesQuery.isLoading,
    canConvert,
    canEditLines,
    canRemoveRows,
    canSubmit,
    canUpdate,
    clearProductRowDraft,
    defaultWarehouseCode,
    detailQuery,
    formError,
    handleBranchChange: branchField.handleBranchChange,
    handleConvert,
    handleSubmit,
    handleUpdate,
    handleWarehouseChange,
    finalizeWarehouseInput,
    header,
    isDirty,
    isSubmitting,
    lineFieldErrors,
    openProductPopup,
    prefetchProducts,
    productRowDrafts,
    productRows,
    removeProductRow,
    selectBranch,
    selectWarehouse,
    setAllQuotedDate,
    setBranchFocused: branchField.setBranchFocused,
    setProductRowDraft,
    setWarehouseFocused,
    showBranch: true,
    totals,
    updateProductRow,
    warehouseFocused,
    warehouseInput,
    warehouseSuggestions,
    warehousesLoading: warehousesQuery.isLoading,
  };
}
