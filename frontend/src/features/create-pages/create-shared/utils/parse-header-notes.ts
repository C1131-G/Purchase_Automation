/**
 * Split SAP header Notes into UI "Reference No" (NumAtCard) vs "Comments".
 *
 * Legacy portal format sometimes stored both in Comments as:
 *   `REF123 | user message`
 *
 * IC automation appends multi-line chain lines (short form):
 *   PQ 8000586
 *   RFQ 8000586
 * Legacy long "Auto Generated Based on …", "Based on …", and `IC | PQD: …` still recognized.
 * Splitting those on " | " steals parent typed text into Ref No — never do that.
 */

export type HeaderNotesFields = {
  comments: string;
  referenceNo: string;
};

const LEGACY_IC_REMARK_LINE_RE = /^IC\s*\|\s*[A-Za-z0-9_-]+\s*:/im;
/** Legacy "Auto Generated Based on …" / "Based on …". */
const BASED_ON_REFERENCE_LINE_RE = /^(?:auto\s+generated\s+)?based on /im;
/** Short IC chain: PQ / RFQ / SQ / PO / AR + doc ref. */
const SHORT_IC_REMARK_LINE_RE = /^(PQD|PQ|RFQ|SQ|PO|AR)\s*:?\s+\S+/im;

/** True when Comments contain IC automation chain lines. */
export const hasIcRemarkLines = (comments: string | null | undefined): boolean => {
  const raw = String(comments ?? "");
  return (
    LEGACY_IC_REMARK_LINE_RE.test(raw) ||
    BASED_ON_REFERENCE_LINE_RE.test(raw) ||
    SHORT_IC_REMARK_LINE_RE.test(raw)
  );
};

/**
 * Map SAP NumAtCard + Comments into form fields without dropping parent text.
 * - Prefer real NumAtCard for Ref No.
 * - Never invent Ref No from IC chain lines.
 * - Legacy `ref | msg` split only for single-line, non-IC Comments.
 */
export const parseDocumentHeaderNotes = (detail: {
  Comments?: unknown;
  NumAtCard?: unknown;
}): HeaderNotesFields => {
  const referenceNo = String(detail.NumAtCard ?? "").trim();
  const rawComments = String(detail.Comments ?? "").trim();

  // IC chain present: keep full Comments (user + IC links). Do not re-split on " | ".
  if (hasIcRemarkLines(rawComments)) {
    return {
      comments: rawComments,
      referenceNo,
    };
  }

  if (referenceNo) {
    const legacyReferencePrefix = `${referenceNo} | `;
    return {
      comments: rawComments.startsWith(legacyReferencePrefix)
        ? rawComments.slice(legacyReferencePrefix.length).trim()
        : rawComments,
      referenceNo,
    };
  }

  // Legacy only: single line "REF | message" with no newlines (old portal packing).
  if (rawComments && !rawComments.includes("\n") && rawComments.includes(" | ")) {
    const splitComments = rawComments.split(" | ").map((part) => part.trim());
    if (splitComments.length > 1) {
      return {
        comments: splitComments.slice(1).join(" | "),
        referenceNo: splitComments[0] ?? "",
      };
    }
  }

  return {
    comments: rawComments,
    referenceNo,
  };
};
