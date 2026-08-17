/** PQ → PO/GRPO/AP Invoice is allowed only after the seller submits the RFQ. */

export const PQ_RFQ_COPY_BLOCKED_MESSAGE =
  "Copy from this purchase quotation is not allowed until the RFQ is submitted.";

export const PQ_RFQ_LOCKED_MESSAGE = "RFQ submitted, can't edit";

const RFQ_LOCK_STATUSES = new Set(["SUBMITTED", "COMPLETED"]);

export const isPqRfqCopyAllowed = (detail: unknown): boolean => {
  if (!detail || typeof detail !== "object") {
    return false;
  }
  return (detail as { rfqCopyAllowed?: boolean }).rfqCopyAllowed === true;
};

/** After RFQ submit/complete, the buyer PQ is read-only (backend IC_PQ_LOCKED). */
export const isPqLockedAfterRfqSubmit = (rfqStatus: unknown): boolean => {
  if (typeof rfqStatus !== "string") {
    return false;
  }
  return RFQ_LOCK_STATUSES.has(rfqStatus.trim().toUpperCase());
};
