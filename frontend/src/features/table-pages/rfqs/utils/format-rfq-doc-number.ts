/** Show RFQ doc number in tables — plain number only (strips legacy RFQ-PQD- prefix). */
export const formatRfqDocNumber = (rfqNumber: string | null | undefined): string => {
  const raw = String(rfqNumber ?? "").trim();
  if (!raw) {
    return "—";
  }
  if (/^\d+$/.test(raw)) {
    return raw;
  }
  const legacy = raw.match(/^RFQ-PQD-(?:E)?(\d+)$/i);
  if (legacy?.[1]) {
    return legacy[1];
  }
  const trailing = raw.match(/(\d+)\s*$/);
  return trailing?.[1] ?? raw;
};
