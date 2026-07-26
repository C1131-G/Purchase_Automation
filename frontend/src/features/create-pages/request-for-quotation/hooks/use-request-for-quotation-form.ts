import { useCallback, useEffect, useMemo, useState } from "react";

import {
  useConvertIcRfq,
  useSubmitIcRfq,
  useUpdateIcRfq,
} from "@/features/intercompany/api/intercompany.mutations";
import { useIcRfq } from "@/features/intercompany/api/intercompany.queries";
import {
  notifyActionError,
  notifyActionSuccess,
  notifyCreateApiError,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

import {
  buildUpdateRfqLinesPayload,
  computeRfqTotals,
  isRfqDraft,
  isRfqSubmitted,
  mapRfqLinesToEditable,
  type RfqEditableLine,
  type RfqSellerEditableFields,
} from "../utils/rfq-form.utils";

export function useRequestForQuotationForm(rfqId: number) {
  const detailQuery = useIcRfq(rfqId, Number.isFinite(rfqId) && rfqId > 0);
  const header = detailQuery.data?.data;

  const [lines, setLines] = useState<RfqEditableLine[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const updateMutation = useUpdateIcRfq();
  const submitMutation = useSubmitIcRfq();
  const convertMutation = useConvertIcRfq();

  const canEditLines = isRfqDraft(header?.status);
  const canSubmit = canEditLines;
  const canConvert = isRfqSubmitted(header?.status);

  // Re-hydrate local line drafts when server detail changes (id + status + line fingerprints).
  useEffect(() => {
    if (!header) {
      return;
    }
    const fingerprint = [
      header.rfqId,
      header.status,
      ...(header.lines ?? []).map(
        (line) =>
          `${line.rfqLineId}:${line.unitPrice ?? ""}:${line.quantity ?? ""}:${line.discount ?? ""}:${line.deliveryDate ?? ""}`,
      ),
    ].join("|");

    if (fingerprint === hydratedKey) {
      return;
    }

    setLines(mapRfqLinesToEditable(header.lines));
    setHydratedKey(fingerprint);
    setFormError(null);
  }, [header, hydratedKey]);

  const totals = useMemo(() => computeRfqTotals(lines), [lines]);

  const isDirty = useMemo(() => {
    if (!header?.lines) {
      return lines.length > 0;
    }
    const server = mapRfqLinesToEditable(header.lines);
    if (server.length !== lines.length) {
      return true;
    }
    for (let i = 0; i < lines.length; i += 1) {
      const local = lines[i];
      const remote = server[i];
      if (!local || !remote) {
        return true;
      }
      if (
        local.unitPrice !== remote.unitPrice ||
        local.quantity !== remote.quantity ||
        local.discount !== remote.discount ||
        local.deliveryDate !== remote.deliveryDate
      ) {
        return true;
      }
    }
    return false;
  }, [header?.lines, lines]);

  const updateLine = useCallback(
    (lineNum: number, patch: Partial<RfqSellerEditableFields>) => {
      if (!canEditLines) {
        return;
      }
      // Only seller-editable fields may be patched — never item/whse/uom/description.
      const allowed: Partial<RfqSellerEditableFields> = {};
      if (patch.unitPrice !== undefined) {
        allowed.unitPrice = patch.unitPrice;
      }
      if (patch.quantity !== undefined) {
        allowed.quantity = patch.quantity;
      }
      if (patch.discount !== undefined) {
        allowed.discount = patch.discount;
      }
      if (patch.deliveryDate !== undefined) {
        allowed.deliveryDate = patch.deliveryDate;
      }
      setLines((prev) =>
        prev.map((line) => (line.lineNum === lineNum ? { ...line, ...allowed } : line)),
      );
      setFormError(null);
    },
    [canEditLines],
  );

  const handleSave = useCallback(async () => {
    if (!header || !canEditLines) {
      return;
    }
    const { errors, lines: payloadLines } = buildUpdateRfqLinesPayload(lines, {
      requireAllPrices: false,
    });
    if (errors.length > 0) {
      const message = errors[0] ?? "Fix line validation errors before saving.";
      setFormError(message);
      return;
    }
    if (payloadLines.length === 0) {
      setFormError("Enter at least one unit price before saving.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        body: { lines: payloadLines },
        rfqId: header.rfqId,
      });
      notifyActionSuccess("Request For Quotation prices saved", "rfq-save");
      setFormError(null);
    } catch (error) {
      const message = toSafeErrorMessage(
        error instanceof Error ? error.message : undefined,
        "Could not save Request For Quotation.",
      );
      setFormError(message);
      notifyCreateApiError(message, "rfq");
    }
  }, [canEditLines, header, lines, updateMutation]);

  const handleSubmit = useCallback(async () => {
    if (!header || !canSubmit) {
      return;
    }

    // Persist current edits before submit so prices are not lost.
    const { errors, lines: payloadLines } = buildUpdateRfqLinesPayload(lines, {
      requireAllPrices: true,
    });
    if (errors.length > 0) {
      const message = errors[0] ?? "Fix line validation errors before submit.";
      setFormError(message);
      return;
    }

    try {
      if (payloadLines.length > 0) {
        await updateMutation.mutateAsync({
          body: { lines: payloadLines },
          rfqId: header.rfqId,
        });
      }
      await submitMutation.mutateAsync(header.rfqId);
      notifyActionSuccess("Request For Quotation submitted", "rfq-submit");
      setFormError(null);
    } catch (error) {
      const message = toSafeErrorMessage(
        error instanceof Error ? error.message : undefined,
        "Could not submit Request For Quotation.",
      );
      setFormError(message);
      notifyCreateApiError(message, "rfq");
    }
  }, [canSubmit, header, lines, submitMutation, updateMutation]);

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
    updateMutation.isPending || submitMutation.isPending || convertMutation.isPending;

  return {
    canConvert,
    canEditLines,
    canSubmit,
    detailQuery,
    formError,
    handleConvert,
    handleSave,
    handleSubmit,
    header,
    isDirty,
    isSubmitting,
    lines,
    totals,
    updateLine,
  };
}
