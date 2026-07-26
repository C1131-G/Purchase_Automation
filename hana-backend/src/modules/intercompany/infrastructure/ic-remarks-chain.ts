/**
 * IC document remarks / Comments chain.
 *
 * Format (one link per line, never replaces user text):
 *   IC | PQD: PQ Draft No 8000586 (Entry 2964)
 *   IC | RFQ: RFQ-PQD-8000586 (Id 3)
 *   IC | PQ: PQ No 2042 (Entry 2042)
 *   IC | SQ: SQ No 810 (Entry 8100)
 *   IC | PO: PO No 5001328 (Entry 35277)
 *   IC | AR: AR Invoice Draft (from IC Flow 2)
 *
 * Existing non-IC remarks are preserved; IC lines append only if that KEY is new.
 */

export type IcRemarkLink = {
  /** Stable key for idempotent append: PQD | RFQ | PQ | SQ | PO | AR */
  key: string;
  /** Human-readable value after the key. */
  text: string;
};

const LINE_RE = /^IC\s*\|\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/i;

export const formatIcRemarkLine = (key: string, text: string): string =>
  `IC | ${key.toUpperCase()}: ${text.trim()}`;

/** Collect IC keys already present in comments. */
export const parseIcRemarkKeys = (remarks: string | null | undefined): Set<string> => {
  const keys = new Set<string>();
  if (!remarks) {
    return keys;
  }
  for (const raw of remarks.replace(/\r\n/g, "\n").split("\n")) {
    const match = raw.trim().match(LINE_RE);
    if (match?.[1]) {
      keys.add(match[1].toUpperCase());
    }
  }
  return keys;
};

/**
 * Append IC link lines without removing existing remarks.
 * Skips keys already present (idempotent re-runs).
 */
export const appendIcRemarkLines = (
  existing: string | null | undefined,
  links: IcRemarkLink[],
): string => {
  const base = (existing ?? "").replace(/\r\n/g, "\n").trimEnd();
  const have = parseIcRemarkKeys(base);
  const toAdd: string[] = [];

  for (const link of links) {
    const key = link.key.trim().toUpperCase();
    const text = link.text.trim();
    if (!key || !text || have.has(key)) {
      continue;
    }
    toAdd.push(formatIcRemarkLine(key, text));
    have.add(key);
  }

  if (toAdd.length === 0) {
    return base;
  }
  if (!base) {
    return toAdd.join("\n");
  }
  return `${base}\n${toAdd.join("\n")}`;
};

/** Short tag for NumAtCard / IC_DOCUMENT_MAPPING (keep ≤ 100 chars). */
export const buildIcCompactTag = (parts: Array<string | number | null | undefined>): string => {
  const joined = parts
    .map((part) => (part === null || part === undefined ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" > ");
  return joined.slice(0, 100);
};

// --- Flow 1 links ---

export const icLinkPqDraft = (
  docNum: number | null | undefined,
  docEntry: number,
): IcRemarkLink => ({
  key: "PQD",
  text:
    docNum != null && Number.isFinite(docNum) && docNum > 0
      ? `PQ Draft No ${docNum} (Entry ${docEntry})`
      : `PQ Draft Entry ${docEntry}`,
});

export const icLinkRfq = (rfqNumber: string, rfqId?: number | null): IcRemarkLink => ({
  key: "RFQ",
  text:
    rfqId != null && Number.isFinite(rfqId) && rfqId > 0 ? `${rfqNumber} (Id ${rfqId})` : rfqNumber,
});

export const icLinkPq = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "PQ",
  text:
    docNum != null && Number.isFinite(docNum) && docNum > 0
      ? `PQ No ${docNum} (Entry ${docEntry})`
      : `PQ Entry ${docEntry}`,
});

export const icLinkSq = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "SQ",
  text:
    docNum != null && Number.isFinite(docNum) && docNum > 0
      ? `SQ No ${docNum} (Entry ${docEntry})`
      : `SQ Entry ${docEntry}`,
});

// --- Flow 2 links ---

export const icLinkPo = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "PO",
  text:
    docNum != null && Number.isFinite(docNum) && docNum > 0
      ? `PO No ${docNum} (Entry ${docEntry})`
      : `PO Entry ${docEntry}`,
});

export const icLinkArDraft = (docEntry?: number | null, docNum?: number | null): IcRemarkLink => ({
  key: "AR",
  text:
    docEntry != null && Number.isFinite(docEntry) && docEntry > 0
      ? docNum != null && Number.isFinite(docNum)
        ? `AR Invoice Draft No ${docNum} (Entry ${docEntry})`
        : `AR Invoice Draft Entry ${docEntry}`
      : "AR Invoice Draft (IC Flow 2 from buyer PO)",
});

/** Compact mapping tags (legacy-compatible + chain hint). */
export const compactPqDraftTag = (docNum: number | null | undefined, docEntry: number): string =>
  docNum != null && Number.isFinite(docNum) && docNum > 0
    ? `IC-PQD-${docNum}`
    : `IC-PQD-E${docEntry}`;

export const compactRfqTag = (rfqNumber: string): string => `IC-RFQ-${rfqNumber}`;

export const compactPoTag = (docNum: number | null | undefined, docEntry: number): string =>
  docNum != null && Number.isFinite(docNum) && docNum > 0
    ? `IC-PO-${docNum}`
    : `IC-PO-E${docEntry}`;

/**
 * Flow 1 RFQ header remarks at create time.
 * Keeps any prior text; adds PQ draft + RFQ lines.
 */
export const buildFlow1RfqRemarks = (params: {
  existing?: string | null;
  pqDraftDocNum: number | null | undefined;
  pqDraftDocEntry: number;
  rfqNumber: string;
  rfqId?: number | null;
}): string =>
  appendIcRemarkLines(params.existing, [
    icLinkPqDraft(params.pqDraftDocNum, params.pqDraftDocEntry),
    icLinkRfq(params.rfqNumber, params.rfqId),
  ]);

/**
 * Flow 1 chain through convert (before SQ exists).
 * PQD → RFQ → PQ
 */
export const buildFlow1ConvertRemarks = (params: {
  existing?: string | null;
  pqDraftDocNum: number | null | undefined;
  pqDraftDocEntry: number;
  rfqNumber: string;
  rfqId: number;
  pqDocNum?: number | null;
  pqDocEntry?: number | null;
}): string => {
  const links: IcRemarkLink[] = [
    icLinkPqDraft(params.pqDraftDocNum, params.pqDraftDocEntry),
    icLinkRfq(params.rfqNumber, params.rfqId),
  ];
  if (params.pqDocEntry != null && Number.isFinite(params.pqDocEntry) && params.pqDocEntry > 0) {
    links.push(icLinkPq(params.pqDocNum, params.pqDocEntry));
  }
  return appendIcRemarkLines(params.existing, links);
};

/**
 * Flow 1 full chain for seller SQ Comments.
 * PQD → RFQ → PQ → SQ
 */
export const buildFlow1SqRemarks = (params: {
  existing?: string | null;
  pqDraftDocNum: number | null | undefined;
  pqDraftDocEntry: number;
  rfqNumber: string;
  rfqId: number;
  pqDocNum?: number | null;
  pqDocEntry: number;
  sqDocNum?: number | null;
  sqDocEntry?: number | null;
}): string => {
  const links: IcRemarkLink[] = [
    icLinkPqDraft(params.pqDraftDocNum, params.pqDraftDocEntry),
    icLinkRfq(params.rfqNumber, params.rfqId),
    icLinkPq(params.pqDocNum, params.pqDocEntry),
  ];
  if (params.sqDocEntry != null && Number.isFinite(params.sqDocEntry) && params.sqDocEntry > 0) {
    links.push(icLinkSq(params.sqDocNum, params.sqDocEntry));
  }
  return appendIcRemarkLines(params.existing, links);
};

/**
 * Flow 2 AR draft Comments: keep PO user remarks + append PO + AR links.
 */
export const buildFlow2ArRemarks = (params: {
  existingComments?: string | null;
  poDocNum: number | null | undefined;
  poDocEntry: number;
  arDocEntry?: number | null;
  arDocNum?: number | null;
}): string =>
  appendIcRemarkLines(params.existingComments, [
    icLinkPo(params.poDocNum, params.poDocEntry),
    icLinkArDraft(params.arDocEntry, params.arDocNum),
  ]);
