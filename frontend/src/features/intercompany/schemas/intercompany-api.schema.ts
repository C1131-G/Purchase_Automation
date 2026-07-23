import { z } from "zod";

/** GET /api/v1/ic/health */
export const icHealthDataSchema = z.object({
  module: z.literal("intercompany"),
  ok: z.literal(true),
  phase: z.string(),
});

export const icHealthResponseSchema = z.object({
  data: icHealthDataSchema,
  success: z.literal(true),
});

export type IcHealthData = z.infer<typeof icHealthDataSchema>;
export type IcHealthResponse = z.infer<typeof icHealthResponseSchema>;

/** Stable hook result when PO/PQ create optionally returns IC outcome (P5+). */
export const icHookResultSchema = z.discriminatedUnion("status", [
  z.object({
    reason: z.string(),
    status: z.literal("skipped"),
  }),
  z.object({
    mappingId: z.number().optional(),
    status: z.literal("success"),
    targetDoc: z
      .object({
        entry: z.number(),
        num: z.number().optional(),
        type: z.string(),
      })
      .optional(),
  }),
  z.object({
    retryId: z.number(),
    status: z.literal("queued_retry"),
  }),
  z.object({
    historyId: z.number().optional(),
    message: z.string(),
    status: z.literal("failed"),
  }),
]);

export type IcHookResult = z.infer<typeof icHookResultSchema>;

/** Notification list item (P8 API contract draft — mirrors backend domain). */
export const icNotificationSchema = z.object({
  companyId: z.number(),
  createdAt: z.string().nullable().optional(),
  documentId: z.string().nullable(),
  documentType: z.string(),
  flowStep: z.string().nullable(),
  isRead: z.boolean(),
  message: z.string().nullable(),
  notificationId: z.number(),
  priority: z.string(),
  title: z.string(),
});

export type IcNotification = z.infer<typeof icNotificationSchema>;

export const icUnreadCountResponseSchema = z.object({
  data: z.object({
    count: z.number().int().nonnegative(),
  }),
  success: z.literal(true),
});

export type IcUnreadCountResponse = z.infer<typeof icUnreadCountResponseSchema>;

export const icRfqStatusSchema = z.enum(["DRAFT", "SUBMITTED", "COMPLETED", "CANCELLED"]);

export type IcRfqStatus = z.infer<typeof icRfqStatusSchema>;

export const icRfqLineSchema = z.object({
  deliveryDate: z.string().nullable(),
  description: z.string().nullable(),
  discount: z.number().nullable(),
  itemCode: z.string(),
  lineNum: z.number(),
  quantity: z.number(),
  remarks: z.string().nullable(),
  rfqId: z.number(),
  rfqLineId: z.number(),
  taxCode: z.string().nullable(),
  unitPrice: z.number().nullable(),
  uomCode: z.string().nullable(),
  warehouse: z.string().nullable(),
});

export type IcRfqLine = z.infer<typeof icRfqLineSchema>;

export const icRfqHeaderSchema = z.object({
  createdBy: z.string().nullable(),
  lines: z.array(icRfqLineSchema).optional(),
  pqDraftDocEntry: z.number(),
  pqDraftDocNum: z.number().nullable(),
  remarks: z.string().nullable(),
  rfqId: z.number(),
  rfqNumber: z.string(),
  sourceCompanyId: z.number(),
  status: z.union([icRfqStatusSchema, z.string()]),
  targetCompanyId: z.number(),
  vendorCode: z.string(),
});

export type IcRfqHeader = z.infer<typeof icRfqHeaderSchema>;
