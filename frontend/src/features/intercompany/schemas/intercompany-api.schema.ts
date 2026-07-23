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

/** Notification list item — mirrors hana-backend `IcNotification`. */
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

/** GET /api/v1/ic/notifications?unreadOnly= */
export const icNotificationsListParamsSchema = z.object({
  unreadOnly: z.boolean().optional(),
});

export type IcNotificationsListParams = z.infer<typeof icNotificationsListParamsSchema>;

export const icNotificationsListResponseSchema = z.object({
  data: z.array(icNotificationSchema),
  success: z.literal(true),
});

export type IcNotificationsListResponse = z.infer<typeof icNotificationsListResponseSchema>;

export const icUnreadCountResponseSchema = z.object({
  data: z.object({
    count: z.number().int().nonnegative(),
  }),
  success: z.literal(true),
});

export type IcUnreadCountResponse = z.infer<typeof icUnreadCountResponseSchema>;

/** PATCH /api/v1/ic/notifications/:id/read */
export const icMarkNotificationReadResponseSchema = z.object({
  data: icNotificationSchema,
  success: z.literal(true),
});

export type IcMarkNotificationReadResponse = z.infer<typeof icMarkNotificationReadResponseSchema>;

/** POST /api/v1/ic/notifications/mark-all-read */
export const icMarkAllNotificationsReadResponseSchema = z.object({
  data: z.object({
    marked: z.number().int().nonnegative(),
  }),
  success: z.literal(true),
});

export type IcMarkAllNotificationsReadResponse = z.infer<
  typeof icMarkAllNotificationsReadResponseSchema
>;

/** Retry queue row — mirrors hana-backend `IcRetryQueueItem`. */
export const icRetryStatusSchema = z.enum(["WAITING", "PROCESSING", "SUCCESS", "DEAD"]);

export type IcRetryStatus = z.infer<typeof icRetryStatusSchema>;

export const icRetryQueueItemSchema = z.object({
  actionCode: z.string(),
  companyId: z.number(),
  docMappingId: z.number().nullable(),
  errorMessage: z.string().nullable(),
  maxRetry: z.number(),
  nextRetryAt: z.string().nullable(),
  payloadJson: z.string().nullable(),
  retryCount: z.number(),
  retryId: z.number(),
  sourceDocument: z.string(),
  status: z.union([icRetryStatusSchema, z.string()]),
  targetDocument: z.string().nullable(),
});

export type IcRetryQueueItem = z.infer<typeof icRetryQueueItemSchema>;

/** GET /api/v1/ic/retries?status=WAITING,DEAD */
export const icRetriesListParamsSchema = z.object({
  /** Comma-separated statuses, or omit for backend default (WAITING,DEAD,PROCESSING). */
  status: z.string().optional(),
});

export type IcRetriesListParams = z.infer<typeof icRetriesListParamsSchema>;

export const icRetriesListResponseSchema = z.object({
  data: z.array(icRetryQueueItemSchema),
  success: z.literal(true),
});

export type IcRetriesListResponse = z.infer<typeof icRetriesListResponseSchema>;

/**
 * POST /api/v1/ic/retries/:id/run
 * Discriminated on `status` from process-retry-queue `runOne`.
 */
export const icRunRetryResultSchema = z.discriminatedUnion("status", [
  z.object({
    item: icRetryQueueItemSchema,
    status: z.literal("success"),
  }),
  z.object({
    errorMessage: z.string(),
    item: icRetryQueueItemSchema,
    status: z.literal("failed"),
  }),
  z.object({
    errorMessage: z.string(),
    item: icRetryQueueItemSchema,
    status: z.literal("dead"),
  }),
]);

export type IcRunRetryResult = z.infer<typeof icRunRetryResultSchema>;

export const icRunRetryResponseSchema = z.object({
  data: icRunRetryResultSchema,
  success: z.literal(true),
});

export type IcRunRetryResponse = z.infer<typeof icRunRetryResponseSchema>;

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
