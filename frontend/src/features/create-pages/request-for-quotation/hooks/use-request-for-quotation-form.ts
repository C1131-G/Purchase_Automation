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
import {
  branchIdFromWarehouse,
  formatBranchDisplay,
  toPositiveBranchId,
  type BranchLookupItem,
  type WarehouseWithBranch,
} from "@/features/create-pages/create-shared/utils/document-branch";
import {
  useConvertIcRfq,
  useSubmitIcRfq,
} from "@/features/intercompany/api/intercompany.mutations";
import { useIcRfq } from "@/features/intercompany/api/intercompany.queries";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

import {
  applyRfqSalesTaxToRows,
  buildUpdateRfqLinesPayloadFromProductRows,
  computeRfqProductTotals,
  getRfqLineFieldErrors,
  isRfqDraft,
  isRfqSubmitted,
  mapRfqLinesToProductRows,
  productRowsFingerprint,
  type RfqLineFieldErrors,
  type RfqSellerProductPatch,
} from "../utils/rfq-form.utils";

const EMPTY_TAX_CODES: CreateLookupOption[] = [];

export function useRequestForQuotationForm(rfqId: number) {
  const detailQuery = useIcRfq(rfqId, Number.isFinite(rfqId) && rfqId > 0);
  const header = detailQuery.data?.data;

  // Seller company masters — resolve RFQ warehouse → branch (OWHS.BPLid / OBPL) for display.
  const warehousesQuery = useQuery(createSharedQueries.warehouses());
  const branchesQuery = useQuery(createSharedQueries.branches());
  const taxCodesQuery = useQuery(createSharedQueries.taxCodes());
  const taxCodes = taxCodesQuery.data ?? EMPTY_TAX_CODES;

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

  const submitMutation = useSubmitIcRfq();
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

  const canEditLines = isRfqDraft(header?.status);
  const canSubmit = canEditLines;
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

    const rows = applyRfqSalesTaxToRows(mapRfqLinesToProductRows(header.lines), taxCodes);
    const requiredMap: Record<string, number> = {};
    for (const row of rows) {
      // Buyer required qty only — never seed from quoted qty.
      requiredMap[row.id] = row.requiredQuantity ?? 0;
    }
    requiredQtyByIdRef.current = requiredMap;
    setProductRows(rows);
    setProductRowDrafts({});
    // Seed header Quoted Date display: only when every line shares one date.
    const lineDates = rows.map((row) => (row.quotedDate ?? "").trim().slice(0, 10)).filter(Boolean);
    const commonDate =
      lineDates.length === rows.length && new Set(lineDates).size <= 1 ? (lineDates[0] ?? "") : "";
    setBatchQuotedDate(commonDate);
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
    const server = mapRfqLinesToProductRows(header.lines);
    return productRowsFingerprint(server) !== productRowsFingerprint(productRows);
  }, [header?.lines, productRows]);

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
          allowed.quantity = patch.quantity;
        }
        if (patch.discountPercent !== undefined) {
          allowed.discountPercent = patch.discountPercent;
        }
        if (patch.discountAmount !== undefined) {
          allowed.discountAmount = patch.discountAmount;
        }
        if (patch.quotedDate !== undefined) {
          allowed.quotedDate = patch.quotedDate;
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
    [canEditLines],
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

  const removeProductRow = useCallback((_id: string) => {
    // Seller cannot remove lines.
  }, []);

  /**
   * Batch fill Quoted Date from the product-section header control.
   * Only rows still empty or still matching the previous batch value get
   * overwritten (mirrors PQ header Required Date sync); user can override per row.
   */
  const setAllQuotedDate = useCallback(
    (value: string) => {
      if (!canEditLines) {
        return;
      }
      const nextDate = value.trim().slice(0, 10);
      if (!nextDate) {
        return;
      }
      const prevBatchDate = lastBatchQuotedDateRef.current;
      lastBatchQuotedDateRef.current = nextDate;
      setBatchQuotedDate(nextDate);
      setProductRows((prev) =>
        prev.map((row) => {
          const lineDate = (row.quotedDate ?? "").trim().slice(0, 10);
          const stillMatchesPrevious =
            !lineDate || (prevBatchDate !== null && lineDate === prevBatchDate);
          if (!stillMatchesPrevious) {
            return row;
          }
          return { ...row, quotedDate: nextDate };
        }),
      );
      setFormError(null);
    },
    [canEditLines],
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

    const { errors, lines: payloadLines } = buildUpdateRfqLinesPayloadFromProductRows(productRows, {
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
        body: { lines: payloadLines },
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
  }, [canSubmit, header, productRows, submitMutation]);

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

  const isSubmitting = submitMutation.isPending || convertMutation.isPending;

  const defaultWarehouseCode = header?.warehouseCode?.trim() || productRows[0]?.warehouseCode || "";

  /** Read-only branch for logistics: WH BPLid → OBPL name; empty → "No Branch". */
  const branchDisplay = useMemo(() => {
    const warehouses = (warehousesQuery.data ?? []) as WarehouseWithBranch[];
    const branches = (branchesQuery.data ?? []) as BranchLookupItem[];
    const branchId = branchIdFromWarehouse(warehouses, defaultWarehouseCode);
    if (branchId == null) {
      return { branchId: null as number | null, branchInput: "" };
    }
    const matched = branches.find((b) => toPositiveBranchId(b.branchId ?? b.code) === branchId);
    const branchInput = matched
      ? formatBranchDisplay(matched.name, matched.code)
      : formatBranchDisplay(`Branch ${branchId}`, branchId);
    return { branchId, branchInput };
  }, [warehousesQuery.data, branchesQuery.data, defaultWarehouseCode]);

  return {
    batchQuotedDate,
    branchId: branchDisplay.branchId,
    branchInput: branchDisplay.branchInput,
    branchesLoading: branchesQuery.isLoading || warehousesQuery.isLoading,
    canConvert,
    canEditLines,
    canSubmit,
    clearProductRowDraft,
    defaultWarehouseCode,
    detailQuery,
    formError,
    handleConvert,
    handleSubmit,
    header,
    isDirty,
    isSubmitting,
    lineFieldErrors,
    openProductPopup,
    prefetchProducts,
    productRowDrafts,
    productRows,
    removeProductRow,
    setProductRowDraft,
    setAllQuotedDate,
    showBranch: true,
    totals,
    updateProductRow,
  };
}
