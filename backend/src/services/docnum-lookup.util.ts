const DEFAULT_DOCNUM_LIMIT = 10;
const MAX_DOCNUM_LIMIT = 100;

export const getSafeDocNumLimit = (limit?: number) => {
  if (!Number.isFinite(limit)) return DEFAULT_DOCNUM_LIMIT;
  const normalized = Math.trunc(limit as number);
  if (normalized < 1) return DEFAULT_DOCNUM_LIMIT;
  return Math.min(normalized, MAX_DOCNUM_LIMIT);
};

