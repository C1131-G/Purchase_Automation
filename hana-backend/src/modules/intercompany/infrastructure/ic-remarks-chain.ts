/**
 * IC document remarks / Comments chain.
 *
 * Format (one link per line, never replaces user text):
 *   IC | PQD: PQ Draft No 8000586
 *   IC | RFQ: RFQ-PQD-8000586
 *   IC | PQ: PQ No 2042
 *   IC | SQ: SQ No 810
 *   IC | PO: PO No 5001328
 *   IC | AR: AR Invoice Draft No 1201
 *
 * Prefer document type + number only (no Flow 1/2 wording).
 * Existing non-IC remarks are preserved; IC lines append only if that KEY is new.
 */

export type IcRemarkLink = {
  /** Stable key for idempotent append: PQD | RFQ | PQ | SQ | PO | AR */
  key: string;
  /** Human-readable value after the key. */
  text: string;
};

const LINE_RE = /^IC\s*\|\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/i;

const hasDocNum = (docNum: number | null | undefined): docNum is number =>
  docNum != null && Number.isFinite(docNum) && docNum > 0;

const hasEntry = (docEntry: number | null | undefined): docEntry is number =>
  docEntry != null && Number.isFinite(docEntry) && docEntry > 0;

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

/** Extract existing `IC | KEY: text` lines so they can be re-merged onto user comments. */
export const parseIcRemarkLinks = (remarks: string | null | undefined): IcRemarkLink[] => {
  const links: IcRemarkLink[] = [];
  if (!remarks) {
    return links;
  }
  for (const raw of remarks.replace(/\r\n/g, "\n").split("\n")) {
    const match = raw.trim().match(LINE_RE);
    if (match?.[1] && match[2] !== undefined && match[2].trim()) {
      links.push({ key: match[1], text: match[2].trim() });
    }
  }
  return links;
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

const collectUserRemarkLines = (remarks: string | null | undefined): string[] => {
  if (!remarks) {
    return [];
  }
  const lines: string[] = [];
  for (const raw of remarks.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed || LINE_RE.test(trimmed)) {
      continue;
    }
    lines.push(line);
  }
  return lines;
};

/**
 * Merge two remarks blobs without dropping original user text.
 * - Non-IC lines from both sides are kept (primary order first, then secondary-only).
 * - IC | KEY lines from both sides are kept (secondary wins on same KEY).
 * Never replaces user comments with only auto-generated IC lines.
 */
export const mergeUserAndIcRemarks = (
  primary: string | null | undefined,
  secondary: string | null | undefined,
): string => {
  const primaryTrim = (primary ?? "").replace(/\r\n/g, "\n").trim();
  const secondaryTrim = (secondary ?? "").replace(/\r\n/g, "\n").trim();
  if (!primaryTrim) {
    return secondaryTrim;
  }
  if (!secondaryTrim) {
    return primaryTrim;
  }

  const userLines: string[] = [];
  const seenUser = new Set<string>();
  for (const line of [
    ...collectUserRemarkLines(primaryTrim),
    ...collectUserRemarkLines(secondaryTrim),
  ]) {
    const key = line.trim().toLowerCase();
    if (seenUser.has(key)) {
      continue;
    }
    seenUser.add(key);
    userLines.push(line);
  }

  const icByKey = new Map<string, IcRemarkLink>();
  for (const link of [...parseIcRemarkLinks(primaryTrim), ...parseIcRemarkLinks(secondaryTrim)]) {
    icByKey.set(link.key.trim().toUpperCase(), {
      key: link.key.trim().toUpperCase(),
      text: link.text.trim(),
    });
  }

  return appendIcRemarkLines(userLines.join("\n"), [...icByKey.values()]);
};

/** Human label for retry queue Source/Target columns (type + number, no Flow wording). */
export const formatIcDocLabel = (params: {
  kind: "PQD" | "RFQ" | "PQ" | "SQ" | "PO" | "AR";
  docNum?: number | string | null;
  docEntry?: number | string | null;
  rfqNumber?: string | null;
}): string => {
  const num =
    params.docNum !== null &&
    params.docNum !== undefined &&
    String(params.docNum).trim() !== "" &&
    Number.isFinite(Number(params.docNum)) &&
    Number(params.docNum) > 0
      ? Number(params.docNum)
      : null;
  const entry =
    params.docEntry !== null &&
    params.docEntry !== undefined &&
    String(params.docEntry).trim() !== "" &&
    Number.isFinite(Number(params.docEntry)) &&
    Number(params.docEntry) > 0
      ? Number(params.docEntry)
      : null;

  switch (params.kind) {
    case "PQD":
      return num != null
        ? `PQ Draft No ${num}`
        : entry != null
          ? `PQ Draft Entry ${entry}`
          : "PQ Draft";
    case "RFQ": {
      const rfq = params.rfqNumber?.trim();
      if (rfq) {
        return `RFQ ${rfq}`;
      }
      return entry != null ? `RFQ Entry ${entry}` : "RFQ";
    }
    case "PQ":
      return num != null ? `PQ No ${num}` : entry != null ? `PQ Entry ${entry}` : "PQ";
    case "SQ":
      return num != null ? `SQ No ${num}` : entry != null ? `SQ Entry ${entry}` : "SQ";
    case "PO":
      return num != null ? `PO No ${num}` : entry != null ? `PO Entry ${entry}` : "PO";
    case "AR":
      return num != null
        ? `AR Invoice Draft No ${num}`
        : entry != null
          ? `AR Invoice Draft Entry ${entry}`
          : "AR Invoice Draft";
    default:
      return "Document";
  }
};

/** Short tag for NumAtCard / IC_DOCUMENT_MAPPING (keep ≤ 100 chars). */
export const buildIcCompactTag = (parts: Array<string | number | null | undefined>): string => {
  const joined = parts
    .map((part) => (part === null || part === undefined ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" > ");
  return joined.slice(0, 100);
};

// --- Document link helpers (type + number only) ---

export const icLinkPqDraft = (
  docNum: number | null | undefined,
  docEntry: number,
): IcRemarkLink => ({
  key: "PQD",
  text: hasDocNum(docNum) ? `PQ Draft No ${docNum}` : `PQ Draft Entry ${docEntry}`,
});

export const icLinkRfq = (rfqNumber: string, _rfqId?: number | null): IcRemarkLink => ({
  key: "RFQ",
  text: String(rfqNumber).trim(),
});

export const icLinkPq = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "PQ",
  text: hasDocNum(docNum) ? `PQ No ${docNum}` : `PQ Entry ${docEntry}`,
});

export const icLinkSq = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "SQ",
  text: hasDocNum(docNum) ? `SQ No ${docNum}` : `SQ Entry ${docEntry}`,
});

export const icLinkPo = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "PO",
  text: hasDocNum(docNum) ? `PO No ${docNum}` : `PO Entry ${docEntry}`,
});

/**
 * AR draft link — only when a document number or entry is known.
 * Never mentions Flow 1/2.
 */
export const icLinkArDraft = (
  docEntry?: number | null,
  docNum?: number | null,
): IcRemarkLink | null => {
  if (hasDocNum(docNum)) {
    return { key: "AR", text: `AR Invoice Draft No ${docNum}` };
  }
  if (hasEntry(docEntry)) {
    return { key: "AR", text: `AR Invoice Draft Entry ${docEntry}` };
  }
  return null;
};

/** Compact mapping tags (legacy-compatible + chain hint). */
export const compactPqDraftTag = (docNum: number | null | undefined, docEntry: number): string =>
  hasDocNum(docNum) ? `IC-PQD-${docNum}` : `IC-PQD-E${docEntry}`;

export const compactRfqTag = (rfqNumber: string): string => `IC-RFQ-${rfqNumber}`;

export const compactPoTag = (docNum: number | null | undefined, docEntry: number): string =>
  hasDocNum(docNum) ? `IC-PO-${docNum}` : `IC-PO-E${docEntry}`;

/**
 * RFQ header remarks at create time.
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
 * Convert chain remarks (before SQ exists).
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
  if (hasEntry(params.pqDocEntry)) {
    links.push(icLinkPq(params.pqDocNum, params.pqDocEntry));
  }
  return appendIcRemarkLines(params.existing, links);
};

/**
 * Full chain for seller SQ Comments.
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
  if (hasEntry(params.sqDocEntry)) {
    links.push(icLinkSq(params.sqDocNum, params.sqDocEntry));
  }
  return appendIcRemarkLines(params.existing, links);
};

/**
 * AR draft Comments: keep PO user remarks + append PO link (and AR when numbered).
 * No Flow 1/2 wording — document type + number only.
 */
export const buildFlow2ArRemarks = (params: {
  existingComments?: string | null;
  poDocNum: number | null | undefined;
  poDocEntry: number;
  arDocEntry?: number | null;
  arDocNum?: number | null;
}): string => {
  const links: IcRemarkLink[] = [icLinkPo(params.poDocNum, params.poDocEntry)];
  const arLink = icLinkArDraft(params.arDocEntry, params.arDocNum);
  if (arLink) {
    links.push(arLink);
  }
  return appendIcRemarkLines(params.existingComments, links);
};
