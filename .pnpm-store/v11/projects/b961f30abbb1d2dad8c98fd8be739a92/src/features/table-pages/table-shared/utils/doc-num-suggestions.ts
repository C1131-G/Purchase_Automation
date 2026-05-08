import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";

interface DocNumPageResponse {
  data?: { DocNum?: number | string | null }[];
  totalPages?: number;
}

type DocNumPageFetcher = (page: number, limit: number) => Promise<DocNumPageResponse>;

const toLookupItems = (
  source: { DocNum?: number | string | null }[] | undefined,
  seen: Set<string>,
  target: LookupItem[],
) => {
  if (!Array.isArray(source)) {
    return;
  }

  for (const row of source) {
    const raw = row?.DocNum;
    if (raw === null || raw === undefined) {
      continue;
    }
    const code = String(raw).trim();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    target.push({ code, name: code });
  }
};

export async function fetchAllDocNumSuggestions({
  fetchPage,
  pageSize = 10,
  maxPages = 1000,
}: {
  fetchPage: DocNumPageFetcher;
  pageSize?: number;
  maxPages?: number;
}): Promise<LookupItem[]> {
  const safePageSize = Math.max(1, pageSize);
  const seen = new Set<string>();
  const allSuggestions: LookupItem[] = [];

  const firstPage = await fetchPage(1, safePageSize);
  toLookupItems(firstPage.data, seen, allSuggestions);

  const totalPages = Math.max(1, firstPage.totalPages ?? 1);
  const finalPage = Math.min(totalPages, Math.max(1, maxPages));

  for (let page = 2; page <= finalPage; page += 1) {
    try {
      const nextPage = await fetchPage(page, safePageSize);
      toLookupItems(nextPage.data, seen, allSuggestions);
    } catch {
      // Keep already-fetched suggestions if any later page fails.
      break;
    }
  }

  return allSuggestions;
}
