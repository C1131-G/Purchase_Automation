/**
 * IC document remarks / Comments chain.
 *
 * Current format (one short document type + number per line):
 *   PQ No. 8000586
 *   RFQ No. 8000586
 *   SQ No. 810
 *
 * Staged chain by document:
 *   RFQ open (create)     → PQ only
 *   PQ after RFQ submit   → PQ + RFQ
 *   SQ                    → PQ + RFQ
 *   PO (from PQ)          → PQ + RFQ (inherited)
 *   AR invoice draft      → PQ + RFQ + SQ
 *
 * Legacy still parsed for merge/idempotency (never re-written unless key missing):
 *   PQ 8000586
 *   Auto Generated Based on AJAX Industries Purchase Quotation 8000586
 *   Based on Purchase Quotation 8000586
 *   IC | PQ: …
 *
 * Existing non-IC remarks are preserved; auto lines append only if that KEY is new.
 * Company / BP names are not written on new lines (keeps Comments short).
 */

/** @deprecated Old long-form prefix; new lines use `PQ No. 123`. */
export const AUTO_GENERATED_REMARK_PREFIX = "Auto Generated";

export type IcRemarkLink = {
  /** Stable key for idempotent append: PQ | RFQ | SQ | PO | AR (PQD legacy) */
  key: string;
  /** Document number (or entry fallback) shown after the type label. */
  text: string;
  /**
   * Optional owner name — ignored when formatting new short lines.
   * Still read from legacy "Based on {name} …" for merge.
   */
  cardName?: string;
};

export const IC_REMARK_PROFILE = {
  BUYER: "buyer",
  SELLER: "seller",
} as const;

export type IcRemarkProfile = (typeof IC_REMARK_PROFILE)[keyof typeof IC_REMARK_PROFILE];

const IC_REMARK_KEY_ORDER = ["PQ", "RFQ", "PO", "SQ"] as const;

const REMARK_KEYS_BY_PROFILE: Record<IcRemarkProfile, readonly string[]> = {
  [IC_REMARK_PROFILE.BUYER]: IC_REMARK_KEY_ORDER,
  [IC_REMARK_PROFILE.SELLER]: IC_REMARK_KEY_ORDER,
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

/** Labels used only when parsing legacy "Based on …" lines. */
const LABEL_TO_KEY: Record<string, string> = {
  "purchase quotation drafts": "PQD",
  "purchase quotation draft": "PQD",
  "request for quotations": "RFQ",
  "request for quotation": "RFQ",
  "purchase quotations": "PQ",
  "purchase quotation": "PQ",
  "sales quotations": "SQ",
  "sales quotation": "SQ",
  "purchase orders": "PO",
  "purchase order": "PO",
  "ar invoice drafts": "AR",
  "ar invoice draft": "AR",
  "ar invoices": "AR",
  "ar invoice": "AR",
};

/** Longest labels first so "Purchase Quotation Draft" wins over "Purchase Quotation". */
const LABEL_ENTRIES_SORTED = Object.entries(LABEL_TO_KEY).toSorted(
  (left, right) => right[0].length - left[0].length,
);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Normalize legacy PQD → PQ so short + long formats share one key. */
const normalizeRemarkKey = (key: string): string => {
  const upper = key.trim().toUpperCase();
  return upper === "PQD" ? "PQ" : upper;
};

/**
 * Bare short IC line: `PQ 8000586`, `RFQ: 9001`, `SQ 810` (legacy compact).
 * Intentional — not free text (must be KEY + single token ref only).
 */
const parseShortIcLine = (
  trimmed: string,
): { cardName?: string; key: string; text: string } | null => {
  const match = trimmed.match(/^(PQD|PQ|RFQ|SQ|PO|AR)\s*:?\s+(?:No\.?\s+)?(\S+)\s*$/i);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return {
    key: normalizeRemarkKey(match[1]),
    text: match[2].trim(),
  };
};

/**
 * Current/legacy form: `PQ No. 8000586` or `Based on PQ 8000586` (optional Auto Generated prefix).
 */
const parseBasedOnShortLine = (
  trimmed: string,
): { cardName?: string; key: string; text: string } | null => {
  const withoutAutoPrefix = trimmed.replace(/^auto\s+generated\s+/i, "").trim();
  const match = withoutAutoPrefix.match(
    /^(?:based on\s+)(PQD|PQ|RFQ|SQ|PO|AR)\s*:?\s+(?:No\.?\s+)?(\S+)\s*$/i,
  );
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return {
    key: normalizeRemarkKey(match[1]),
    text: match[2].trim(),
  };
};

/**
 * Parse legacy "Auto Generated Based on [CardName] <Label> <docRef>" lines.
 * CardName may contain spaces. Also accepts "Based on …" without Auto Generated.
 */
const parseBasedOnLine = (
  trimmed: string,
): { cardName?: string; key: string; text: string } | null => {
  const short = parseBasedOnShortLine(trimmed);
  if (short) {
    return short;
  }
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
    const pattern = new RegExp(
      `^(?:(.+?)\\s+)?${escapeRegExp(label)}\\s+(?:No\\.?\\s+)?(\\S+)\\s*$`,
      "i",
    );
    const match = rest.match(pattern);
    if (match?.[2]) {
      const cardName = match[1]?.trim();
      return {
        cardName: cardName || undefined,
        key: normalizeRemarkKey(key),
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
  LEGACY_IC_LINE_RE.test(trimmed) ||
  parseShortIcLine(trimmed) != null ||
  parseBasedOnLine(trimmed) != null;

/**
 * Format one IC chain line with its unique document type and number.
 * `cardName` is ignored so a repeated company/BP name never bloats every line.
 */
export const formatIcRemarkLine = (
  key: string,
  docRefText: string,
  _cardName?: string | null,
): string => {
  const code = normalizeRemarkKey(key);
  return `${code} No. ${docRefText.trim()}`;
};

/** Collect IC keys already present in comments (short + legacy + Based on). */
export const parseIcRemarkKeys = (remarks: string | null | undefined): Set<string> => {
  const keys = new Set<string>();
  if (!remarks) {
    return keys;
  }
  for (const raw of normalizeRemarkNewlines(remarks).split("\n")) {
    const trimmed = raw.trim();
    const legacy = trimmed.match(LEGACY_IC_LINE_RE);
    if (legacy?.[1]) {
      keys.add(normalizeRemarkKey(legacy[1]));
      continue;
    }
    const short = parseShortIcLine(trimmed);
    if (short?.key) {
      keys.add(short.key);
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
        key: normalizeRemarkKey(legacy[1]),
        text: extractDocRefFromLegacyText(legacy[2]),
      });
      continue;
    }
    const short = parseShortIcLine(trimmed);
    if (short) {
      links.push({
        key: short.key,
        text: short.text,
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
const parseAnyIcLine = (
  trimmed: string,
): { key: string; text: string; cardName?: string } | null => {
  const legacy = trimmed.match(LEGACY_IC_LINE_RE);
  if (legacy?.[1] && legacy[2] !== undefined && legacy[2].trim()) {
    return {
      key: normalizeRemarkKey(legacy[1]),
      text: extractDocRefFromLegacyText(legacy[2]),
    };
  }
  return parseShortIcLine(trimmed) ?? parseBasedOnLine(trimmed);
};

/**
 * Append IC link lines without removing existing remarks.
 * Drops duplicate keys already in `existing` (same PQ twice, short + SAP long form).
 * Skips keys already present when adding (idempotent re-runs).
 */
export const appendIcRemarkLines = (
  existing: string | null | undefined,
  links: IcRemarkLink[],
): string => {
  const base = normalizeRemarkNewlines(existing ?? "").trimEnd();
  const have = new Set<string>();
  const kept: string[] = [];

  for (const raw of base.split("\n")) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parsed = parseAnyIcLine(trimmed);
    if (parsed) {
      const key = normalizeRemarkKey(parsed.key);
      if (have.has(key)) {
        continue;
      }
      have.add(key);
    }
    kept.push(line);
  }

  const toAdd: string[] = [];
  for (const link of links) {
    const key = normalizeRemarkKey(link.key);
    const text = link.text.trim();
    if (!key || !text || have.has(key)) {
      continue;
    }
    toAdd.push(formatIcRemarkLine(key, text, link.cardName));
    have.add(key);
  }

  const next = [...kept, ...toAdd];
  return next.join("\n");
};

/** True only when remarks already contain a portal-managed IC document link. */
export const hasIcRemarkChain = (remarks: string | null | undefined): boolean =>
  parseIcRemarkLinks(remarks).some((link) => ["PQ", "RFQ", "PO", "SQ"].includes(link.key));

/**
 * Rebuild IC lines in the shared PQ → RFQ → PO → SQ business order while retaining user text.
 * Both sides receive the same known chain; unavailable document numbers are simply omitted.
 */
export const normalizeIcRemarks = (
  remarks: string | null | undefined,
  profile: IcRemarkProfile,
  additions: IcRemarkLink[] = [],
): string => {
  const allowedKeys = REMARK_KEYS_BY_PROFILE[profile];
  const linksByKey = new Map<string, IcRemarkLink>();

  for (const link of [...parseIcRemarkLinks(remarks), ...additions]) {
    const key = normalizeRemarkKey(link.key);
    const text = link.text.trim();
    if (allowedKeys.includes(key) && text) {
      linksByKey.set(key, { ...link, key, text });
    }
  }

  const orderedLinks = allowedKeys.flatMap((key) => {
    const link = linksByKey.get(key);
    return link ? [link] : [];
  });
  return appendIcRemarkLines(collectUserRemarkLines(remarks).join("\n"), orderedLinks);
};

/** SAP object type → IC remark key. Copy-to Comments omit these; SAP stamps its own line. */
const SAP_BASE_TYPE_REMARK_KEY: Record<number, string> = {
  540000006: "PQ",
  23: "SQ",
  22: "PO",
  18: "AR",
};

export const stripIcRemarkKeys = (
  remarks: string | null | undefined,
  keys: Iterable<string>,
): string => {
  const drop = new Set([...keys].map((key) => normalizeRemarkKey(key)).filter(Boolean));
  if (drop.size === 0) {
    return normalizeRemarkNewlines(remarks ?? "").trim();
  }
  const userText = collectUserRemarkLines(remarks).join("\n");
  const keep = parseIcRemarkLinks(remarks).filter(
    (link) => !drop.has(normalizeRemarkKey(link.key)),
  );
  return appendIcRemarkLines(userText, keep);
};

/**
 * When lines are SAP-based on a source doc, drop our matching "Based on" lines.
 * Service Layer appends its own "Based On Purchase Quotations …" otherwise you get PQ twice.
 */
export const commentsWithoutSapBaseAutoLines = (
  comments: unknown,
  lines: Array<{ BaseType?: unknown }>,
): string => {
  const text = typeof comments === "string" ? comments : undefined;
  const keys = new Set<string>();
  for (const line of lines) {
    const baseType = Number(line.BaseType);
    const key = Number.isFinite(baseType) ? SAP_BASE_TYPE_REMARK_KEY[baseType] : undefined;
    if (key) {
      keys.add(key);
    }
  }
  if (keys.size === 0) {
    return normalizeRemarkNewlines(text ?? "").trim();
  }
  return stripIcRemarkKeys(text, keys);
};

/**
 * SAP B1 `Document.Comments` / ODOC.Comments max length (Service Layer rejects longer values).
 */
export const SAP_DOCUMENT_COMMENTS_MAX_LEN = 254;

/**
 * Fit remarks into SAP Document.Comments (254 chars).
 * Prefer IC auto-lines (chain); shrink free-text first; drop company names on IC lines if needed;
 * hard-cut only as last resort.
 */
export const clampSapDocumentComments = (
  value: string | null | undefined,
  maxLen: number = SAP_DOCUMENT_COMMENTS_MAX_LEN,
): string => {
  const raw = normalizeRemarkNewlines(value ?? "").trimEnd();
  if (raw.length <= maxLen) {
    return raw;
  }

  const userText = collectUserRemarkLines(raw).join("\n");
  const icLinks = parseIcRemarkLinks(raw);
  let icBlock = appendIcRemarkLines("", icLinks);

  if (icBlock.length > maxLen) {
    // Long company names — rebuild without cardName.
    icBlock = appendIcRemarkLines(
      "",
      icLinks.map((link) => ({ key: link.key, text: link.text })),
    );
  }
  if (icBlock.length > maxLen) {
    return icBlock.slice(0, maxLen);
  }

  if (!userText) {
    return icBlock;
  }
  if (!icBlock) {
    return userText.slice(0, maxLen).trimEnd();
  }

  const sep = "\n";
  const budget = maxLen - icBlock.length - sep.length;
  if (budget <= 0) {
    return icBlock;
  }
  const clippedUser = userText.slice(0, budget).trimEnd();
  if (!clippedUser) {
    return icBlock;
  }
  return `${clippedUser}${sep}${icBlock}`;
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
    const key = normalizeRemarkKey(link.key);
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
 * AR invoice draft link — only when a document number or entry is known.
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
 * RFQ header remarks at create / open time. The known PQ and RFQ references are retained.
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
  const { buyer, seller } = resolveOwnerNames(params);
  return normalizeIcRemarks(params.existing, IC_REMARK_PROFILE.SELLER, [
    icLinkPq(params.pqDraftDocNum, params.pqDraftDocEntry, buyer),
    icLinkRfq(params.rfqNumber, params.rfqId, seller),
  ]);
};

/**
 * Convert chain remarks after RFQ submit (PQ updated). Both known references are retained.
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
  return normalizeIcRemarks(params.existing, IC_REMARK_PROFILE.BUYER, [
    icLinkPq(
      params.pqDocNum ?? params.pqDraftDocNum,
      params.pqDocEntry ?? params.pqDraftDocEntry,
      buyer,
    ),
    icLinkRfq(params.rfqNumber, params.rfqId, seller),
  ]);
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
 * Seller SQ Comments: vendor ref (user line) + known PQ/RFQ/SQ references.
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
  const links: IcRemarkLink[] = [
    icLinkPq(params.pqDocNum ?? params.pqDraftDocNum, params.pqDocEntry, buyer),
    icLinkRfq(params.rfqNumber, params.rfqId, seller),
  ];
  if (hasDocNum(params.sqDocNum)) {
    links.push(icLinkSq(params.sqDocNum, params.sqDocEntry ?? params.sqDocNum, seller));
  } else if (hasEntry(params.sqDocEntry)) {
    links.push(icLinkSq(null, params.sqDocEntry, seller));
  }
  return normalizeIcRemarks(withVendorRef, IC_REMARK_PROFILE.SELLER, links);
};

/**
 * Seller A/R draft Comments: keep user remarks and carry the complete PQ/RFQ/PO/SQ chain.
 * The A/R draft self-link is never retained.
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
    /** Buyer PO identity included in the final seller-side chain. */
    poDocNum?: number | null | undefined;
    /** Buyer PO identity included in the final seller-side chain. */
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
  if (hasDocNum(params.poDocNum)) {
    links.push(icLinkPo(params.poDocNum, params.poDocEntry ?? params.poDocNum, buyer));
  } else if (hasEntry(params.poDocEntry)) {
    links.push(icLinkPo(null, params.poDocEntry, buyer));
  }
  return normalizeIcRemarks(params.existingComments, IC_REMARK_PROFILE.SELLER, links);
};
