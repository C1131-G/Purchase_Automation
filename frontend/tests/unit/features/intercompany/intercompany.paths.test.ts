import { describe, expect, it } from "vitest";

import { IC_API_PATHS } from "@/features/intercompany/api/intercompany.paths";
import {
  icHealthResponseSchema,
  icHookResultSchema,
  icNotificationSchema,
  icRfqHeaderSchema,
  icUnreadCountResponseSchema,
} from "@/features/intercompany/schemas/intercompany-api.schema";

describe("IC API paths (P4 shell)", () => {
  it("builds the authenticated health path", () => {
    expect(IC_API_PATHS.health).toBe("/api/v1/ic/health");
  });

  it("reserves notification and RFQ paths for later phases", () => {
    expect(IC_API_PATHS.notifications).toBe("/api/v1/ic/notifications");
    expect(IC_API_PATHS.notificationsUnreadCount).toBe("/api/v1/ic/notifications/unread-count");
    expect(IC_API_PATHS.rfqs).toBe("/api/v1/ic/rfqs");
  });
});

describe("IC API schemas (P4 shell)", () => {
  it("parses a health response", () => {
    const parsed = icHealthResponseSchema.parse({
      data: {
        module: "intercompany",
        ok: true,
        phase: "P3",
      },
      success: true,
    });
    expect(parsed.data.module).toBe("intercompany");
    expect(parsed.data.ok).toBe(true);
  });

  it("accepts all IcHookResult variants", () => {
    expect(icHookResultSchema.parse({ reason: "not_ic", status: "skipped" }).status).toBe(
      "skipped",
    );
    expect(
      icHookResultSchema.parse({
        mappingId: 1,
        status: "success",
        targetDoc: { entry: 10, num: 100, type: "AR_DRAFT" },
      }).status,
    ).toBe("success");
    expect(icHookResultSchema.parse({ retryId: 9, status: "queued_retry" }).status).toBe(
      "queued_retry",
    );
    expect(icHookResultSchema.parse({ message: "SL fail", status: "failed" }).status).toBe(
      "failed",
    );
  });

  it("parses notification and RFQ DTO shapes for P8 readiness", () => {
    const notification = icNotificationSchema.parse({
      companyId: 1,
      documentId: "RFQ-1",
      documentType: "RFQ",
      flowStep: "03-notify-seller",
      isRead: false,
      message: "New RFQ",
      notificationId: 42,
      priority: "NORMAL",
      title: "IC RFQ",
    });
    expect(notification.notificationId).toBe(42);

    const unread = icUnreadCountResponseSchema.parse({
      data: { count: 3 },
      success: true,
    });
    expect(unread.data.count).toBe(3);

    const rfq = icRfqHeaderSchema.parse({
      createdBy: "buyer",
      lines: [],
      pqDraftDocEntry: 5,
      pqDraftDocNum: 500,
      remarks: null,
      rfqId: 7,
      rfqNumber: "RFQ-0007",
      sourceCompanyId: 1,
      status: "DRAFT",
      targetCompanyId: 2,
      vendorCode: "V-IC-B",
    });
    expect(rfq.rfqNumber).toBe("RFQ-0007");
  });
});
