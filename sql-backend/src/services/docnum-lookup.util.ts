// DocNum Lookup Utility: Shared helper for safe DocNum search limits.

const MAX_SUGGESTIONS = 10;

export const getSafeDocNumLimit = (limit?: number): number => {
  if (!limit || limit < 1) return MAX_SUGGESTIONS;
  return Math.min(limit, 100);
};
