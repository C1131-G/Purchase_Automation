/** Display number for IC RFQ (plain doc num or trailing digits from legacy RFQ-PQD-{num}). */
export const parseRfqDisplayNum = (rfqNumber: string | null | undefined): number => {
  const raw = String(rfqNumber ?? "").trim();
  if (!raw) {
    return 0;
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  const match = raw.match(/(\d+)\s*$/);
  return match?.[1] ? Number(match[1]) : 0;
};
