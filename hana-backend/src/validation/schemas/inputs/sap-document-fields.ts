import { z } from "zod";
import {
  isIsoCalendarDate,
  SAP_FIELD_MAX,
  VALIDATION_PATTERN,
} from "@/validation/validation-contracts";

/**
 * SAP Business One marketing-document and payment field lengths
 * from the DI API / HANA tables (CardCode 15, Comments 254, …).
 */
export { SAP_FIELD_MAX };

export const sapOptionalText = (max: number) => z.string().max(max).optional();

/** UI `documentBranchPayload` — keep both keys so Zod does not strip/reject branch. */
export const sapDocumentBranchFields = {
  BPL_IDAssignedToInvoice: z.number().int().positive().optional(),
  branchId: z.number().int().positive().optional(),
};

/** UI `documentSeriesPayload` — NNM1.Series. */
export const sapDocumentSeriesFields = {
  Series: z.number().int().positive().optional(),
  series: z.number().int().positive().optional(),
};

/** Stamped on portal create when the user left remarks empty (IC and normal). */
export const CREATED_FROM_PORTAL_REMARK = "Created from portal";

/** SAP Document.Comments / VendorPayments.Remarks — clip to 254 so SL does not reject. */
export const toSapCommentsField = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }
  const clipped = String(value).trim().slice(0, SAP_FIELD_MAX.comments);
  return clipped || undefined;
};

/** Create only — empty remarks become `Created from portal`. Update still uses toSapCommentsField. */
export const toSapCreateCommentsField = (value: unknown): string =>
  toSapCommentsField(value) ?? CREATED_FROM_PORTAL_REMARK;

export const sapRequiredText = (max: number) => z.string().min(1).max(max);

export const sapOptionalCode = (max: number) => z.string().max(max).optional();

export const sapIsoDateSchema = z
  .string()
  .regex(VALIDATION_PATTERN.isoDate, "Invalid date format (YYYY-MM-DD)")
  .refine(isIsoCalendarDate, "Invalid calendar date");
