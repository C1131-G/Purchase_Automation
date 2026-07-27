/**
 * Split SAP header Notes into UI "Reference No" (NumAtCard) vs "Comments".
 *
 * Legacy portal format sometimes stored both in Comments as:
 *   `REF123 | user message`
 *
 * IC automation appends multi-line chain lines:
 *   IC | PQD: …
 *   IC | RFQ: …
 * Splitting those on " | " steals parent typed text into Ref No — never do that.
 */

export type HeaderNotesFields = {
  comments: string;
  referenceNo: string;
};

const IC_REMARK_LINE_RE = /^IC\s*\|\s*[A-Za-z0-9_-]+\s*:/im;

/** True when Comments contain IC automation chain lines. */
export const hasIcRemarkLines = (comments: string | null | undefined): boolean =>
  IC_REMARK_LINE_RE.test(String(comments ?? ""));

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
