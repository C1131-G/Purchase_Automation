/**
 * Shared rank + cap for create-page inline typeahead suggestions.
 * Caps list length so large vendor catalogs do not lag keystrokes.
 */

export const INLINE_SUGGESTION_LIMIT = 20;

export type RankableLookup = {
  code: string;
  name: string;
};

const scoreLookup = (item: RankableLookup, term: string): number => {
  const code = item.code.toLowerCase();
  const name = item.name.toLowerCase();
  if (code === term || name === term) {
    return 0;
  }
  if (code.startsWith(term) || name.startsWith(term)) {
    return 1;
  }
  if (code.includes(term) || name.includes(term)) {
    return 2;
  }
  return 3;
};

/** Rank lookups by exact → prefix → contains match; empty term keeps order. */
export const rankLookupOptions = <T extends RankableLookup>(
  items: readonly T[],
  rawSearch: string,
): T[] => {
  const term = rawSearch.trim().toLowerCase();
  if (!term) {
    return [...items];
  }

  return [...items].toSorted((a, b) => {
    const byScore = scoreLookup(a, term) - scoreLookup(b, term);
    if (byScore !== 0) {
      return byScore;
    }
    return a.code.localeCompare(b.code, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
};

/** Cap suggestion lists for typeahead (default top 20). */
export const limitInlineSuggestions = <T>(
  items: readonly T[],
  limit: number = INLINE_SUGGESTION_LIMIT,
): T[] => {
  if (limit <= 0) {
    return [];
  }
  if (items.length <= limit) {
    return [...items];
  }
  return items.slice(0, limit);
};

/** Rank then cap — preferred one-shot helper for create lookup hooks. */
export const rankAndLimitLookupOptions = <T extends RankableLookup>(
  items: readonly T[],
  rawSearch: string,
  limit: number = INLINE_SUGGESTION_LIMIT,
): T[] => limitInlineSuggestions(rankLookupOptions(items, rawSearch), limit);
