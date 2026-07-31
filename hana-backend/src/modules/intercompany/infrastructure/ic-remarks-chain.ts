/**
 * IC document remarks / Comments chain.
 *
 * Format (one link per line, never replaces user text):
 *   Auto Generated Based on AJAX Industries Purchase Quotation 8000586
 *   Auto Generated Based on RCM Trading Request For Quotation 8000586
 *   Auto Generated Based on RCM Trading Sales Quotation 810
 *
 * Names are IC company display names (document owners), not BP CardCode:
 *   PQ / PO  → buyer company (who created PQ first, e.g. AJAX)
 *   RFQ / SQ / AR → seller company (e.g. RCM)
 *
 * Staged chain by document:
 *   RFQ open (create)     → PQ only (buyer name)
 *   PQ after RFQ submit   → PQ (buyer) + RFQ (seller)
 *   SQ                    → PQ (buyer) + RFQ (seller)
 *   PO (from PQ)          → PQ + RFQ (inherited)
 *   AR invoice            → PQ (buyer) + RFQ (seller) + SQ (seller)
 *
 * Code/name is optional. Legacy lines without "Auto Generated" still parse:
 *   Based on Purchase Quotation 8000586
 *
 * Legacy `IC | KEY: …` and PQD / AR draft labels are still parsed for merge/idempotency.
 * Existing non-IC remarks are preserved; auto lines append only if that KEY is new.
 */

/** Prefix on every system-generated IC remarks line. */
export const AUTO_GENERATED_REMARK_PREFIX = "Auto Generated";

export type IcRemarkLink = {
  /** Stable key for idempotent append: PQ | RFQ | SQ | PO | AR (PQD legacy) */
  key: string;
  /** Document number (or entry fallback) shown after the type label. */
  text: string;
  /**
   * Document-owner company display name before the document type
   * (e.g. "AJAX Industries" for PQ, "RCM Trading" for RFQ). Never CardCode.
   */
  cardName?: string;
};

/** Buyer owns PQ/PO; seller owns RFQ/SQ/AR. Prefer IC_COMPANY.COMPANY_NAME. */
export type IcDocOwnerNames = {
  /** Buyer company display name (PQ / PO owner). */
  buyerCompanyName?: string | null;
  /** Seller company display name (RFQ / SQ / AR owner). */
  sellerCompanyName?: string | null;
  /**
   * @deprecated Single name for every link — prefer buyerCompanyName + sellerCompanyName.
   */
  cardName?: string | null;
};

const resolveOwnerNames = (
  params: IcDocOwnerNames,
): { buyer: string | undefined; seller: string | undefined } => {
  const fallback =
    params.cardName != null && String(params.cardName).trim()
      ? String(params.cardName).trim()
      : undefined;
  const buyer =
    params.buyerCompanyName != null && String(params.buyerCompanyName).trim()
      ? String(params.buyerCompanyName).trim()
      : fallback;
  const seller =
    params.sellerCompanyName != null && String(params.sellerCompanyName).trim()
      ? String(params.sellerCompanyName).trim()
      : fallback;
  return { buyer, seller };
};

const LEGACY_IC_LINE_RE = /^IC\s*\|\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/i;

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

/** Longest labels first so "Purchase Quotation Draft" wins over "Purchase Quotation". */
const LABEL_ENTRIES_SORTED = Object.entries(LABEL_TO_KEY).toSorted(
  (left, right) => right[0].length - left[0].length,
);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Parse "Auto Generated Based on [CardName] <Label> <docRef>" lines.
 * CardName may contain spaces. Also accepts legacy "Based on …" without Auto Generated.
 */
const parseBasedOnLine = (
  trimmed: string,
): { cardName?: string; key: string; text: string } | null => {
  const withoutAutoPrefix = trimmed.replace(/^auto\s+generated\s+/i, "").trim();
  if (!/^based on\s+/i.test(withoutAutoPrefix)) {
    return null;
  }
  const rest = withoutAutoPrefix.replace(/^based on\s+/i, "").trim();
  if (!rest) {
    return null;
  }
  for (const [label, key] of LABEL_ENTRIES_SORTED) {
    // Optional multi-word CardName before the known document label.
    const pattern = new RegExp(`^(?:(.+?)\\s+)?${escapeRegExp(label)}\\s+(\\S+)\\s*$`, "i");
    const match = rest.match(pattern);
    if (match?.[2]) {
      const cardName = match[1]?.trim();
      return {
        cardName: cardName || undefined,
        key,
        text: match[2].trim(),
      };
    }
  }
  return null;
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
  LEGACY_IC_LINE_RE.test(trimmed) || parseBasedOnLine(trimmed) != null;

export const formatIcRemarkLine = (
  key: string,
  docRefText: string,
  cardName?: string | null,
): string => {
  const label = IC_DOC_TYPE_LABEL[key.toUpperCase()] ?? key;
  const name = cardName != null ? String(cardName).trim() : "";
  const basedOn =
    name.length > 0
      ? `Based on ${name} ${label} ${docRefText.trim()}`
      : `Based on ${label} ${docRefText.trim()}`;
  return `${AUTO_GENERATED_REMARK_PREFIX} ${basedOn}`;
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
    const basedOn = parseBasedOnLine(trimmed);
    if (basedOn?.key) {
      keys.add(basedOn.key);
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
    const basedOn = parseBasedOnLine(trimmed);
    if (basedOn) {
      links.push({
        cardName: basedOn.cardName,
        key: basedOn.key,
        text: basedOn.text,
      });
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
    toAdd.push(formatIcRemarkLine(key, text, link.cardName));
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
    const key = link.key.trim().toUpperCase();
    const prev = icByKey.get(key);
    icByKey.set(key, {
      cardName: link.cardName?.trim() || prev?.cardName,
      key,
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

type IcLinkCardName = string | null | undefined;

const withCardName = (link: IcRemarkLink, cardName?: IcLinkCardName): IcRemarkLink => {
  const name = cardName != null ? String(cardName).trim() : "";
  return name ? { ...link, cardName: name } : link;
};

/** @deprecated Prefer icLinkPq — real PQ is the Flow 1 source document. */
export const icLinkPqDraft = (
  docNum: number | null | undefined,
  docEntry: number,
  cardName?: IcLinkCardName,
): IcRemarkLink => icLinkPq(docNum, docEntry, cardName);

export const icLinkRfq = (
  rfqNumber: string | number | null | undefined,
  rfqId?: number | null,
  cardName?: IcLinkCardName,
): IcRemarkLink => {
  const fromNumber = rfqNumber !== null && rfqNumber !== undefined ? String(rfqNumber).trim() : "";
  const text = fromNumber.length > 0 ? fromNumber : hasEntry(rfqId) ? String(rfqId) : "";
  return withCardName(
    {
      key: "RFQ",
      text,
    },
    cardName,
  );
};

export const icLinkPq = (
  docNum: number | null | undefined,
  docEntry: number,
  cardName?: IcLinkCardName,
): IcRemarkLink =>
  withCardName(
    {
      key: "PQ",
      text: docRef(docNum, docEntry),
    },
    cardName,
  );

export const icLinkSq = (
  docNum: number | null | undefined,
  docEntry: number,
  cardName?: IcLinkCardName,
): IcRemarkLink =>
  withCardName(
    {
      key: "SQ",
      text: docRef(docNum, docEntry),
    },
    cardName,
  );

export const icLinkPo = (
  docNum: number | null | undefined,
  docEntry: number,
  cardName?: IcLinkCardName,
): IcRemarkLink =>
  withCardName(
    {
      key: "PO",
      text: docRef(docNum, docEntry),
    },
    cardName,
  );

/**
 * AR invoice link — only when a document number or entry is known.
 * Never mentions Flow 1/2.
 */
export const icLinkArDraft = (
  docEntry?: number | null,
  docNum?: number | null,
  cardName?: IcLinkCardName,
): IcRemarkLink | null => {
  if (hasDocNum(docNum)) {
    return withCardName({ key: "AR", text: String(docNum) }, cardName);
  }
  if (hasEntry(docEntry)) {
    return withCardName({ key: "AR", text: String(docEntry) }, cardName);
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
 * RFQ header remarks at create / open time.
 * Keeps any prior user text; adds **PQ only** (buyer owner name).
 * RFQ line is added after submit on PQ/SQ.
 */
export const buildFlow1RfqRemarks = (
  params: {
    existing?: string | null;
    pqDraftDocNum: number | null | undefined;
    pqDraftDocEntry: number;
    rfqNumber?: string;
    rfqId?: number | null;
  } & IcDocOwnerNames,
): string => {
  const { buyer } = resolveOwnerNames(params);
  return appendIcRemarkLines(params.existing, [
    icLinkPq(params.pqDraftDocNum, params.pqDraftDocEntry, buyer),
  ]);
};

/**
 * Convert chain remarks after RFQ submit (PQ updated).
 * PQ (buyer owner) + RFQ (seller owner) — no SQ yet.
 */
export const buildFlow1ConvertRemarks = (
  params: {
    existing?: string | null;
    pqDraftDocNum: number | null | undefined;
    pqDraftDocEntry: number;
    rfqNumber: string;
    rfqId: number;
    pqDocNum?: number | null;
    pqDocEntry?: number | null;
  } & IcDocOwnerNames,
): string => {
  const { buyer, seller } = resolveOwnerNames(params);
  const pqEntry = hasEntry(params.pqDocEntry) ? params.pqDocEntry! : params.pqDraftDocEntry;
  const pqNum = hasEntry(params.pqDocEntry) ? params.pqDocNum : params.pqDraftDocNum;
  const links: IcRemarkLink[] = [
    icLinkPq(pqNum, pqEntry, buyer),
    icLinkRfq(params.rfqNumber, params.rfqId, seller),
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
 * Seller SQ Comments: vendor ref (user line) + PQ (buyer) + RFQ (seller) only.
 */
export const buildFlow1SqRemarks = (
  params: {
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
  } & IcDocOwnerNames,
): string => {
  const { buyer, seller } = resolveOwnerNames(params);
  const withVendorRef = ensureVendorRefInRemarks(params.existing, params.vendorRefNo);
  const pqEntry = hasEntry(params.pqDocEntry) ? params.pqDocEntry : params.pqDraftDocEntry;
  const pqNum = hasEntry(params.pqDocEntry) ? params.pqDocNum : params.pqDraftDocNum;
  // SQ only carries PQ + RFQ (two details). SQ self-link is not written here.
  const links: IcRemarkLink[] = [
    icLinkPq(pqNum, pqEntry, buyer),
    icLinkRfq(params.rfqNumber, params.rfqId, seller),
  ];
  return appendIcRemarkLines(withVendorRef, links);
};

/**
 * AR invoice Comments: keep PO user remarks + ensure PQ (buyer) + RFQ (seller) + SQ (seller).
 * Does not append PO or AR self-links.
 */
export const buildFlow2ArRemarks = (
  params: {
    existingComments?: string | null;
    /** Prefer explicit chain when known; otherwise existing Comments IC lines are kept. */
    pqDocNum?: number | null;
    pqDocEntry?: number | null;
    rfqNumber?: string | null;
    rfqId?: number | null;
    sqDocNum?: number | null;
    sqDocEntry?: number | null;
    /** @deprecated PO is not part of AR IC chain — ignored. */
    poDocNum?: number | null | undefined;
    /** @deprecated PO is not part of AR IC chain — ignored. */
    poDocEntry?: number | null | undefined;
    /** @deprecated AR self-link is not written — ignored. */
    arDocEntry?: number | null;
    /** @deprecated AR self-link is not written — ignored. */
    arDocNum?: number | null;
  } & IcDocOwnerNames,
): string => {
  const { buyer, seller } = resolveOwnerNames(params);
  const links: IcRemarkLink[] = [];
  if (hasDocNum(params.pqDocNum)) {
    links.push(icLinkPq(params.pqDocNum, params.pqDocEntry ?? params.pqDocNum, buyer));
  } else if (hasEntry(params.pqDocEntry)) {
    links.push(icLinkPq(null, params.pqDocEntry, buyer));
  }
  const rfqNum = params.rfqNumber != null ? String(params.rfqNumber).trim() : "";
  if (rfqNum || hasEntry(params.rfqId)) {
    links.push(icLinkRfq(rfqNum || null, params.rfqId, seller));
  }
  if (hasDocNum(params.sqDocNum)) {
    links.push(icLinkSq(params.sqDocNum, params.sqDocEntry ?? params.sqDocNum, seller));
  } else if (hasEntry(params.sqDocEntry)) {
    links.push(icLinkSq(null, params.sqDocEntry, seller));
  }
  return appendIcRemarkLines(params.existingComments, links);
};
