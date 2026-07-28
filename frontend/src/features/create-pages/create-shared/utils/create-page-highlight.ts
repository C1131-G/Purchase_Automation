import { z } from "zod";

/** Shared search params for IC notification deep-links into create/edit pages. */
export const createPageHighlightSearchSchema = z.object({
  highlightDocNum: z.string().optional(),
  highlightUntil: z.coerce.number().optional(),
});

export type CreatePageHighlightSearch = z.infer<typeof createPageHighlightSearchSchema>;

export type CreatePageHighlightProps = {
  highlightDocNum?: string;
  highlightUntil?: number;
};

/** Omits undefined highlight search params for exactOptionalPropertyTypes-safe spreads. */
export function toCreatePageHighlightProps(
  highlightDocNum?: string,
  highlightUntil?: number,
): CreatePageHighlightProps {
  const props: CreatePageHighlightProps = {};
  if (highlightDocNum !== undefined) {
    props.highlightDocNum = highlightDocNum;
  }
  if (highlightUntil !== undefined) {
    props.highlightUntil = highlightUntil;
  }
  return props;
}

const HIGHLIGHT_DURATION_MS = 8_000;

export const buildCreatePageHighlightSearch = (
  highlightDocNum: string,
): CreatePageHighlightSearch => ({
  highlightDocNum,
  highlightUntil: Date.now() + HIGHLIGHT_DURATION_MS,
});

/** Returns the doc ref to highlight when the TTL has not expired. */
export const resolveActiveHighlightDocRef = (
  highlightDocNum?: string,
  highlightUntil?: number,
  now = Date.now(),
): string | null => {
  const ref = highlightDocNum?.trim();
  if (!ref) {
    return null;
  }
  if (highlightUntil != null && highlightUntil <= now) {
    return null;
  }
  return ref;
};
