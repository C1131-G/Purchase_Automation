/**
 * IC document remarks / Comments chain.
 *
 * Format (one link per line, never replaces user text):
 *   Based on Purchase Quotation 8000586
 *   Based on Request For Quotation 8000586
 *   Based on Sales Quotation 810
 *   Based on Purchase Order 5001328
 *   Based on AR Invoice 1201
 *
 * Legacy `IC | KEY: …` and PQD / AR draft labels are still parsed for merge/idempotency.
 * Existing non-IC remarks are preserved; auto lines append only if that KEY is new.
 */

export type IcRemarkLink = {
  /** Stable key for idempotent append: PQ | RFQ | SQ | PO | AR (PQD legacy) */
  key: string;
  /** Document number (or entry fallback) shown after the type label. */
  text: string;
};

const LEGACY_IC_LINE_RE = /^IC\s*\|\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/i;
const BASED_ON_LINE_RE = /^Based on (.+?)\s+(\S+)\s*$/i;

const IC_DOC_TYPE_LABEL: Record<string, string> = {
  PQD: "Purchase Quotation Draft",
  RFQ: "Request For Quotation",
  PQ: "Purchase Quotation",
  SQ: "Sales Quotation",
  PO: "Purchase Order",
  AR: "AR Invoice",
};

const LABEL_TO_KEY: Record<string, string> = {
  "purchase quotation draft": "PQD",
  "request for quotation": "RFQ",
  "purchase quotation": "PQ",
  "sales quotation": "SQ",
  "purchase order": "PO",
  "ar invoice draft": "AR",
  "ar invoice": "AR",
};

const hasDocNum = (docNum: number | null | undefined): docNum is number =>
  docNum != null && Number.isFinite(docNum) && docNum > 0;

const hasEntry = (docEntry: number | null | undefined): docEntry is number =>
  docEntry != null && Number.isFinite(docEntry) && docEntry > 0;

const normalizeRemarkNewlines = (remarks: string): string =>
  remarks.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const docRef = (docNum: number | null | undefined, docEntry: number): string =>
  hasDocNum(docNum) ? String(docNum) : String(docEntry);

/** Extract a numeric doc ref from legacy `IC | KEY: PQ Draft No 9001` text. */
const extractDocRefFromLegacyText = (text: string): string => {
  const trimmed = text.trim();
  const numMatch = trimmed.match(/(\d+)\s*$/);
  if (numMatch?.[1]) {
    return numMatch[1];
  }
  return trimmed;
};

const isAutoRemarkLine = (trimmed: string): boolean =>
  LEGACY_IC_LINE_RE.test(trimmed) || BASED_ON_LINE_RE.test(trimmed);

export const formatIcRemarkLine = (key: string, docRefText: string): string => {
  const label = IC_DOC_TYPE_LABEL[key.toUpperCase()] ?? key;
  return `Based on ${label} ${docRefText.trim()}`;
};

/** Collect IC keys already present in comments (legacy + Based on formats). */
export const parseIcRemarkKeys = (remarks: string | null | undefined): Set<string> => {
  const keys = new Set<string>();
  if (!remarks) {
    return keys;
  }
  for (const raw of normalizeRemarkNewlines(remarks).split("\n")) {
    const trimmed = raw.trim();
    const legacy = trimmed.match(LEGACY_IC_LINE_RE);
    if (legacy?.[1]) {
      keys.add(legacy[1].toUpperCase());
      continue;
    }
    const basedOn = trimmed.match(BASED_ON_LINE_RE);
    if (basedOn?.[1]) {
      const mapped = LABEL_TO_KEY[basedOn[1].trim().toLowerCase()];
      if (mapped) {
        keys.add(mapped);
      }
    }
  }
  return keys;
};

/** Extract existing auto-reference lines so they can be re-merged onto user comments. */
export const parseIcRemarkLinks = (remarks: string | null | undefined): IcRemarkLink[] => {
  const links: IcRemarkLink[] = [];
  if (!remarks) {
    return links;
  }
  for (const raw of normalizeRemarkNewlines(remarks).split("\n")) {
    const trimmed = raw.trim();
    const legacy = trimmed.match(LEGACY_IC_LINE_RE);
    if (legacy?.[1] && legacy[2] !== undefined && legacy[2].trim()) {
      links.push({
        key: legacy[1].toUpperCase(),
        text: extractDocRefFromLegacyText(legacy[2]),
      });
      continue;
    }
    const basedOn = trimmed.match(BASED_ON_LINE_RE);
    if (basedOn?.[1] && basedOn[2]) {
      const mapped = LABEL_TO_KEY[basedOn[1].trim().toLowerCase()];
      if (mapped) {
        links.push({ key: mapped, text: basedOn[2].trim() });
      }
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
  const base = normalizeRemarkNewlines(existing ?? "").trimEnd();
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
  for (const raw of normalizeRemarkNewlines(remarks).split("\n")) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed || isAutoRemarkLine(trimmed)) {
      continue;
    }
    lines.push(line);
  }
  return lines;
};

/**
 * Merge two remarks blobs without dropping original user text.
 * - Non-IC lines from both sides are kept (primary order first, then secondary-only).
 * - Auto-reference lines from both sides are kept (secondary wins on same KEY).
 * Never replaces user comments with only auto-generated IC lines.
 */
export const mergeUserAndIcRemarks = (
  primary: string | null | undefined,
  secondary: string | null | undefined,
): string => {
  const primaryTrim = normalizeRemarkNewlines(primary ?? "").trim();
  const secondaryTrim = normalizeRemarkNewlines(secondary ?? "").trim();
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
      // Legacy label for old maps; new flows use kind "PQ".
      return num != null ? `PQ No ${num}` : entry != null ? `PQ Entry ${entry}` : "PQ";
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
        ? `AR Invoice No ${num}`
        : entry != null
          ? `AR Invoice Entry ${entry}`
          : "AR Invoice";
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

/** @deprecated Prefer icLinkPq — real PQ is the Flow 1 source document. */
export const icLinkPqDraft = (docNum: number | null | undefined, docEntry: number): IcRemarkLink =>
  icLinkPq(docNum, docEntry);

export const icLinkRfq = (
  docNum: number | null | undefined,
  docEntry?: number | null,
): IcRemarkLink => ({
  key: "RFQ",
  text: hasDocNum(docNum) ? String(docNum) : hasEntry(docEntry) ? String(docEntry) : "",
});

export const icLinkPq = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "PQ",
  text: docRef(docNum, docEntry),
});

export const icLinkSq = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "SQ",
  text: docRef(docNum, docEntry),
});

export const icLinkPo = (docNum: number | null | undefined, docEntry: number): IcRemarkLink => ({
  key: "PO",
  text: docRef(docNum, docEntry),
});

/**
 * AR invoice link — only when a document number or entry is known.
 * Never mentions Flow 1/2.
 */
export const icLinkArDraft = (
  docEntry?: number | null,
  docNum?: number | null,
): IcRemarkLink | null => {
  if (hasDocNum(docNum)) {
    return { key: "AR", text: String(docNum) };
  }
  if (hasEntry(docEntry)) {
    return { key: "AR", text: String(docEntry) };
  }
  return null;
};

/** Compact mapping tags (legacy-compatible + chain hint). Source is real PQ. */
export const compactPqDraftTag = (docNum: number | null | undefined, docEntry: number): string =>
  hasDocNum(docNum) ? `IC-PQ-${docNum}` : `IC-PQ-E${docEntry}`;

export const compactRfqTag = (rfqNumber: string): string => `IC-RFQ-${rfqNumber}`;

export const compactPoTag = (docNum: number | null | undefined, docEntry: number): string =>
  hasDocNum(docNum) ? `IC-PO-${docNum}` : `IC-PO-E${docEntry}`;

/**
 * RFQ header remarks at create time.
 * Keeps any prior text; adds PQ + RFQ lines.
 */
export const buildFlow1RfqRemarks = (params: {
  existing?: string | null;
  pqDraftDocNum: number | null | undefined;
  pqDraftDocEntry: number;
  rfqNumber: string;
  rfqId?: number | null;
}): string =>
  appendIcRemarkLines(params.existing, [
    icLinkPq(params.pqDraftDocNum, params.pqDraftDocEntry),
    icLinkRfq(params.pqDraftDocNum, params.pqDraftDocEntry),
  ]);

/**
 * Convert chain remarks (before SQ exists).
 * PQ → RFQ (same PQ is updated from RFQ; no second PQ link).
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
  const pqEntry = hasEntry(params.pqDocEntry) ? params.pqDocEntry! : params.pqDraftDocEntry;
  const pqNum = hasEntry(params.pqDocEntry) ? params.pqDocNum : params.pqDraftDocNum;
  const links: IcRemarkLink[] = [
    icLinkPq(pqNum, pqEntry),
    icLinkRfq(params.pqDraftDocNum, params.pqDraftDocEntry),
  ];
  return appendIcRemarkLines(params.existing, links);
};

/**
 * Ensure buyer vendor ref appears once in remarks (plain user line, not IC key).
 * Keeps parent typed text first; does not replace existing lines that already contain the ref.
 */
export const ensureVendorRefInRemarks = (
  remarks: string | null | undefined,
  vendorRefNo: string | null | undefined,
): string => {
  const base = normalizeRemarkNewlines(remarks ?? "").trimEnd();
  const ref = vendorRefNo != null ? String(vendorRefNo).trim() : "";
  if (!ref) {
    return base;
  }
  const refLine = `Vendor Ref No: ${ref}`;
  const lower = base.toLowerCase();
  if (lower.includes(ref.toLowerCase()) || lower.includes("vendor ref no:")) {
    return base;
  }
  if (!base) {
    return refLine;
  }
  // Keep vendor ref with other user lines (before auto-reference chain).
  const userLines = collectUserRemarkLines(base);
  const icLinks = parseIcRemarkLinks(base);
  const mergedUser = [...userLines, refLine];
  return appendIcRemarkLines(mergedUser.join("\n"), icLinks);
};

/**
 * Full chain for seller SQ Comments.
 * Vendor ref (user line) + PQ → RFQ → SQ
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
  /** Buyer PQ NumAtCard — shown on seller SQ remarks. */
  vendorRefNo?: string | null;
}): string => {
  const withVendorRef = ensureVendorRefInRemarks(params.existing, params.vendorRefNo);
  const pqEntry = hasEntry(params.pqDocEntry) ? params.pqDocEntry : params.pqDraftDocEntry;
  const pqNum = hasEntry(params.pqDocEntry) ? params.pqDocNum : params.pqDraftDocNum;
  const links: IcRemarkLink[] = [
    icLinkPq(pqNum, pqEntry),
    icLinkRfq(params.pqDraftDocNum, params.pqDraftDocEntry),
  ];
  if (hasEntry(params.sqDocEntry)) {
    links.push(icLinkSq(params.sqDocNum, params.sqDocEntry));
  }
  return appendIcRemarkLines(withVendorRef, links);
};

/**
 * AR invoice Comments: keep PO user remarks + append PO link (and AR when numbered).
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
