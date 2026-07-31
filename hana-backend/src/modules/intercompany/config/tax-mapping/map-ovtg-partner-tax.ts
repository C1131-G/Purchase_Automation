import type { PartnerTaxDocSide } from "./partner-tax.masters";

/** SAP OVTG.Category — purchase (input) vs sales (output). */
export const OVTG_CATEGORY_PURCHASE = "I";
export const OVTG_CATEGORY_SALES = "O";

export type OvtgTaxRecord = {
  code: string;
  rate: number;
  category: string;
};

export const normalizeOvtgCategory = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toUpperCase();

export const targetOvtgCategory = (docSide: PartnerTaxDocSide): string =>
  docSide === "purchase" ? OVTG_CATEGORY_PURCHASE : OVTG_CATEGORY_SALES;

const ratesMatch = (left: number, right: number): boolean =>
  Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.000_001;

const normalizeTaxCode = (code: string): string => code.trim().toUpperCase();

/** Prefer standard IN-* / OUT-* naming used across partner companies. */
const preferredPrefix = (docSide: PartnerTaxDocSide): "IN" | "OUT" =>
  docSide === "sales" ? "OUT" : "IN";

/**
 * Codes that are often wrong on normal AR/SQ when a standard OUT/IN pair exists
 * (RCM / reverse-charge style labels — still allowed if they are the only match).
 */
const isRcmLikeTaxCode = (code: string): boolean => {
  const normalized = normalizeTaxCode(code);
  return (
    normalized.includes("RCM") ||
    normalized.includes("REVCH") ||
    normalized.includes("REVERSE") ||
    normalized === "GSTO" ||
    normalized.startsWith("GSTO") ||
    normalized.startsWith("GSTI")
  );
};

const startsWithPrefix = (code: string, prefix: "IN" | "OUT"): boolean => {
  const normalized = normalizeTaxCode(code);
  return (
    normalized === prefix ||
    normalized.startsWith(`${prefix}-`) ||
    normalized.startsWith(`${prefix}_`) ||
    normalized.startsWith(prefix)
  );
};

/**
 * Build likely partner codes from source naming, e.g. IN-12.5 → OUT-12.5.
 * Separators (- _ space or none) are preserved as variants so OVTG rows match dynamically.
 */
export const buildMirrorTaxCodeCandidates = (
  sourceCode: string,
  targetDocSide: PartnerTaxDocSide,
): string[] => {
  const code = sourceCode.trim();
  if (!code) {
    return [];
  }

  const want = preferredPrefix(targetDocSide);
  const from = want === "OUT" ? "IN" : "OUT";
  const candidates: string[] = [];

  // Same code on target company (e.g. both use OUT-12.5).
  candidates.push(code);

  const swap = code.match(new RegExp(`^${from}([-_\\s]?)(.+)$`, "i"));
  if (swap) {
    const rest = swap[2];
    const sep = swap[1] || "";
    candidates.push(`${want}${sep}${rest}`);
    candidates.push(`${want}-${rest}`);
    candidates.push(`${want}_${rest}`);
    candidates.push(`${want}${rest}`);
  }

  // Already on target side prefix — keep as primary.
  if (startsWithPrefix(code, want)) {
    candidates.unshift(code);
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of candidates) {
    const key = normalizeTaxCode(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item.trim());
  }
  return unique;
};

const scoreCandidate = (params: {
  code: string;
  sourceCode: string;
  targetDocSide: PartnerTaxDocSide;
  mirrorKeys: Set<string>;
}): number => {
  const code = params.code.trim();
  const key = normalizeTaxCode(code);
  const want = preferredPrefix(params.targetDocSide);
  let score = 0;

  // Exact / mirror name from source (IN-12.5 ↔ OUT-12.5) wins over rate-only.
  if (params.mirrorKeys.has(key)) {
    score += 1000;
  }
  if (normalizeTaxCode(params.sourceCode) === key) {
    score += 100;
  }
  if (startsWithPrefix(code, want)) {
    score += 50;
  }
  // Prefer non-RCM when standard OUT/IN exists at same rate.
  if (!isRcmLikeTaxCode(code)) {
    score += 20;
  }
  // Mild preference for shorter standard codes (OUT-12.5 over OUT-12.5-SPECIAL).
  score -= Math.min(code.length, 40);

  return score;
};

/**
 * Cross-company tax from live OVTG rows:
 * 1) Same Rate + target Category (I purchase / O sales)
 * 2) Prefer dynamic IN-* ↔ OUT-* mirror of the source code
 * 3) Prefer standard OUT/IN prefix; deprioritize RCM/GSTO-like labels when better options exist
 *
 * PQ→SQ and PO→AR: e.g. buyer IN-12.5 @ 12.5% → seller OUT-12.5 @ 12.5% (not GSTO/RCM).
 */
export const mapTaxCodeByOvtgRate = (params: {
  sourceTax: OvtgTaxRecord | null;
  targetDocSide: PartnerTaxDocSide;
  targetTaxes: OvtgTaxRecord[];
}): string | null => {
  const sourceTax = params.sourceTax;
  if (!sourceTax || !Number.isFinite(sourceTax.rate)) {
    return null;
  }

  const wantedCategory = targetOvtgCategory(params.targetDocSide);
  const candidates = params.targetTaxes.filter(
    (row) =>
      normalizeOvtgCategory(row.category) === wantedCategory &&
      ratesMatch(row.rate, sourceTax.rate) &&
      row.code.trim(),
  );

  if (candidates.length === 0) {
    return null;
  }

  const mirrorKeys = new Set(
    buildMirrorTaxCodeCandidates(sourceTax.code, params.targetDocSide).map(normalizeTaxCode),
  );

  const ranked = [...candidates].sort((left, right) => {
    const leftScore = scoreCandidate({
      code: left.code,
      mirrorKeys,
      sourceCode: sourceTax.code,
      targetDocSide: params.targetDocSide,
    });
    const rightScore = scoreCandidate({
      code: right.code,
      mirrorKeys,
      sourceCode: sourceTax.code,
      targetDocSide: params.targetDocSide,
    });
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    return left.code.localeCompare(right.code);
  });

  return ranked[0]?.code.trim() || null;
};
