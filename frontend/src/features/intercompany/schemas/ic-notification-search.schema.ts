import { z } from "zod";

export const icNotificationColumnFilterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .strict(),
]);

export const icNotificationColumnFilterSchema = z.object({
  id: z.string(),
  value: icNotificationColumnFilterValueSchema,
});

/**
 * URL search for `/intercompany/notifications`.
 * Filtering is client-side over the session-company list from GET /ic/notifications.
 */
export const icNotificationSearchSchema = z.object({
  columnFilters: z.array(icNotificationColumnFilterSchema).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  documentId: z.string().optional(),
  documentType: z.string().optional(),
  isRead: z.enum(["all", "unread", "read"]).optional().catch("all"),
  limit: z.coerce.number().int().min(1).catch(10),
  page: z.coerce.number().int().min(1).catch(1),
  priority: z.string().optional(),
  q: z.string().optional(),
  sorting: z.array(z.object({ desc: z.boolean(), id: z.string() })).optional(),
  title: z.string().optional(),
});

export type IcNotificationSearch = z.infer<typeof icNotificationSearchSchema>;
export type IcNotificationColumnFilter = z.infer<typeof icNotificationColumnFilterSchema>;
