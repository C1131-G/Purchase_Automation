import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useConvertIcRfq,
  useSubmitIcRfq,
} from "@/features/intercompany/api/intercompany.mutations";
import { useIcRfq } from "@/features/intercompany/api/intercompany.queries";
import {
  notifyActionError,
  notifyActionSuccess,
  notifyCreateApiError,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import type {
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

import {
  buildUpdateRfqLinesPayloadFromProductRows,
  computeRfqProductTotals,
  isRfqDraft,
  isRfqSubmitted,
  mapRfqLinesToProductRows,
  productRowsFingerprint,
  type RfqSellerProductPatch,
} from "../utils/rfq-form.utils";

export function useRequestForQuotationForm(rfqId: number) {
  const detailQuery = useIcRfq(rfqId, Number.isFinite(rfqId) && rfqId > 0);
  const header = detailQuery.data?.data;

  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({});
  const [hydratedKey, setHydratedKey] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const requiredQtyByIdRef = useRef<Record<string, number>>({});

  const submitMutation = useSubmitIcRfq();
  const convertMutation = useConvertIcRfq();

  const canEditLines = isRfqDraft(header?.status);
  const canSubmit = canEditLines;
  const canConvert = isRfqSubmitted(header?.status);

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

    const rows = mapRfqLinesToProductRows(header.lines);
    const requiredMap: Record<string, number> = {};
    for (const row of rows) {
      // Buyer required qty only — never seed from quoted qty.
      requiredMap[row.id] = row.requiredQuantity ?? 0;
    }
    requiredQtyByIdRef.current = requiredMap;
    setProductRows(rows);
    setProductRowDrafts({});
    setHydratedKey(fingerprint);
    setFormError(null);
  }, [header, hydratedKey]);

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
      if (!canEditLines) {
        return;
      }
      // Only seller-editable fields may be patched.
      const allowed: Partial<RfqSellerProductPatch> = {};
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
      setFormError(null);
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

    const { errors, lines: payloadLines } = buildUpdateRfqLinesPayloadFromProductRows(productRows, {
      requireAllPrices: true,
    });
    if (errors.length > 0) {
      const message = errors[0] ?? "Fix line validation errors before submit.";
      setFormError(message);
      return;
    }

    try {
      // Single request: save lines (if any) + mark SUBMITTED. Notify + PQ/SQ convert
      // run server-side in background — do not PUT then POST.
      const submitted = await submitMutation.mutateAsync({
        rfqId: header.rfqId,
        ...(payloadLines.length > 0 ? { body: { lines: payloadLines } } : {}),
      });
      const status = String(submitted.data?.status ?? "").toUpperCase();
      notifyActionSuccess(
        status === "COMPLETED"
          ? "RFQ submitted and converted (PQ + SQ)"
          : "RFQ submitted — PQ + SQ converting in background",
        "rfq-submit",
      );
      setFormError(null);
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

  return {
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
    openProductPopup,
    prefetchProducts,
    productRowDrafts,
    productRows,
    removeProductRow,
    setProductRowDraft,
    totals,
    updateProductRow,
  };
}
