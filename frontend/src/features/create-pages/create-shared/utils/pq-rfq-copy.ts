/** PQ → PO/GRPO/AP Invoice is allowed only after the seller submits the RFQ. */

export const PQ_RFQ_COPY_BLOCKED_MESSAGE =
  "Copy from this purchase quotation is not allowed until the RFQ is submitted.";

export const isPqRfqCopyAllowed = (detail: unknown): boolean => {
  if (!detail || typeof detail !== "object") {
    return false;
  }
  return (detail as { rfqCopyAllowed?: boolean }).rfqCopyAllowed === true;
};
