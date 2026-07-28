import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";
import { buildCreatePageHighlightSearch } from "@/features/create-pages/create-shared/utils/create-page-highlight";
import { formatRfqDocNumber } from "@/features/table-pages/rfqs/utils/format-rfq-doc-number";

export type IcNotificationDocLink = {
  /** Exact matched text in the notification message. */
  label: string;
  start: number;
  end: number;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  highlightDocNum: string;
};

type DocPattern = {
  regex: RegExp;
  resolve: (match: RegExpMatchArray, notification: IcNotification) => IcNotificationDocLink | null;
};

const withHighlight = (
  link: Omit<IcNotificationDocLink, "start" | "end" | "label"> & {
    label: string;
    start: number;
    end: number;
  },
): IcNotificationDocLink => ({
  ...link,
  search: {
    ...link.search,
    ...buildCreatePageHighlightSearch(link.highlightDocNum),
  },
});

const DOC_PATTERNS: DocPattern[] = [
  {
    regex: /\bPQ\s+Draft\s+No\s+(\d+)\b/gi,
    resolve: (match, _notification) => {
      const docNum = match[1]!;
      const label = match[0]!;
      return withHighlight({
        end: (match.index ?? 0) + label.length,
        highlightDocNum: docNum,
        label,
        search: { draftDocNum: docNum },
        start: match.index ?? 0,
        to: "/purchase/create-quotation",
      });
    },
  },
  {
    regex: /\bPQ\s+No\s+(\d+)\b/gi,
    resolve: (match) => {
      const docNum = match[1]!;
      const label = match[0]!;
      return withHighlight({
        end: (match.index ?? 0) + label.length,
        highlightDocNum: docNum,
        label,
        params: { docNum },
        start: match.index ?? 0,
        to: "/purchase/quotations/$docNum/update",
      });
    },
  },
  {
    regex: /\bSQ\s+No\s+(\d+)\b/gi,
    resolve: (match) => {
      const docNum = match[1]!;
      const label = match[0]!;
      return withHighlight({
        end: (match.index ?? 0) + label.length,
        highlightDocNum: docNum,
        label,
        params: { docNum },
        start: match.index ?? 0,
        to: "/sales/quotations/$docNum/update",
      });
    },
  },
  {
    regex: /\bRFQ\s+Entry\s+(\d+)\b/gi,
    resolve: (match, notification) => {
      const rfqId = notification.documentId?.trim();
      if (!rfqId || notification.documentType.trim().toUpperCase() !== "RFQ") {
        return null;
      }
      const label = match[0]!;
      const highlightDocNum =
        formatRfqDocNumber(notification.message?.match(/\bRFQ\s+(\S+)/i)?.[1]) || rfqId;
      return withHighlight({
        end: (match.index ?? 0) + label.length,
        highlightDocNum,
        label,
        params: { rfqId },
        start: match.index ?? 0,
        to: "/sales/request-for-quotations/$rfqId",
      });
    },
  },
  {
    regex: /\bRFQ\s+(\S+)\b/gi,
    resolve: (match, notification) => {
      const rfqId = notification.documentId?.trim();
      if (!rfqId || notification.documentType.trim().toUpperCase() !== "RFQ") {
        return null;
      }
      const label = match[0]!;
      const highlightDocNum = formatRfqDocNumber(match[1]) || match[1]!;
      return withHighlight({
        end: (match.index ?? 0) + label.length,
        highlightDocNum,
        label,
        params: { rfqId },
        start: match.index ?? 0,
        to: "/sales/request-for-quotations/$rfqId",
      });
    },
  },
];

const resolvePrimaryDocLink = (notification: IcNotification): IcNotificationDocLink | null => {
  const documentId = notification.documentId?.trim();
  if (!documentId) {
    return null;
  }

  const documentType = notification.documentType.trim().toUpperCase();

  if (documentType === "RFQ") {
    const highlightDocNum =
      formatRfqDocNumber(notification.message?.match(/\bRFQ\s+(\S+)/i)?.[1]) || documentId;
    return withHighlight({
      end: 0,
      highlightDocNum,
      label: "",
      params: { rfqId: documentId },
      start: 0,
      to: "/sales/request-for-quotations/$rfqId",
    });
  }

  if (documentType === "PQ") {
    return withHighlight({
      end: 0,
      highlightDocNum: documentId,
      label: "",
      params: { docNum: documentId },
      start: 0,
      to: "/purchase/quotations/$docNum/update",
    });
  }

  if (documentType === "SQ") {
    return withHighlight({
      end: 0,
      highlightDocNum: documentId,
      label: "",
      params: { docNum: documentId },
      start: 0,
      to: "/sales/quotations/$docNum/update",
    });
  }

  if (documentType === "PQ_DRAFT") {
    return withHighlight({
      end: 0,
      highlightDocNum: documentId,
      label: "",
      search: { draftDocNum: documentId },
      start: 0,
      to: "/purchase/create-quotation",
    });
  }

  return null;
};

/** Parse IC doc references from a notification message for inline navigation. */
export const parseIcNotificationDocLinks = (
  notification: IcNotification,
): IcNotificationDocLink[] => {
  const message = notification.message?.trim();
  if (!message) {
    const primary = resolvePrimaryDocLink(notification);
    return primary ? [primary] : [];
  }

  const links: IcNotificationDocLink[] = [];
  const occupied: Array<{ start: number; end: number }> = [];

  for (const pattern of DOC_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match = pattern.regex.exec(message);
    while (match) {
      const resolved = pattern.resolve(match, notification);
      if (resolved) {
        const overlaps = occupied.some(
          (range) => resolved.start < range.end && resolved.end > range.start,
        );
        if (!overlaps) {
          links.push(resolved);
          occupied.push({ end: resolved.end, start: resolved.start });
        }
      }
      match = pattern.regex.exec(message);
    }
  }

  links.sort((a, b) => a.start - b.start);
  return links;
};

/** Best navigation target when the user activates a notification row. */
export const getIcNotificationPrimaryLink = (
  notification: IcNotification,
): IcNotificationDocLink | null => {
  const inlineLinks = parseIcNotificationDocLinks(notification);
  if (inlineLinks.length > 0) {
    const documentType = notification.documentType.trim().toUpperCase();
    const preferred =
      documentType === "PQ"
        ? inlineLinks.find((link) => link.to.includes("/purchase/quotations/"))
        : documentType === "SQ"
          ? inlineLinks.find((link) => link.to.includes("/sales/quotations/"))
          : documentType === "RFQ"
            ? inlineLinks.find((link) => link.to.includes("/request-for-quotations/"))
            : inlineLinks[0];
    return preferred ?? inlineLinks[0] ?? null;
  }

  return resolvePrimaryDocLink(notification);
};
