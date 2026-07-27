import { describe, expect, it } from "vitest";

import { IC_API_PATHS } from "@/features/intercompany/api/intercompany.paths";
import {
  icHealthResponseSchema,
  icHookResultSchema,
  icMarkAllNotificationsReadResponseSchema,
  icMarkNotificationReadResponseSchema,
  icNotificationSchema,
  icNotificationsListResponseSchema,
  icRetriesListResponseSchema,
  icRetryQueueItemSchema,
  icRfqHeaderSchema,
  icRunRetryResponseSchema,
  icUnreadCountResponseSchema,
} from "@/features/intercompany/schemas/intercompany-api.schema";

describe("IC API paths (P8A)", () => {
  it("builds the authenticated health path", () => {
    expect(IC_API_PATHS.health).toBe("/api/v1/ic/health");
  });

  it("exposes notification and retry paths", () => {
    expect(IC_API_PATHS.notifications).toBe("/api/v1/ic/notifications");
    expect(IC_API_PATHS.notificationsUnreadCount).toBe("/api/v1/ic/notifications/unread-count");
    expect(IC_API_PATHS.notificationsMarkAllRead).toBe("/api/v1/ic/notifications/mark-all-read");
    expect(IC_API_PATHS.notificationRead(42)).toBe("/api/v1/ic/notifications/42/read");
    expect(IC_API_PATHS.retries).toBe("/api/v1/ic/retries");
    expect(IC_API_PATHS.retryRun(9)).toBe("/api/v1/ic/retries/9/run");
    expect(IC_API_PATHS.rfqs).toBe("/api/v1/ic/rfqs");
    expect(IC_API_PATHS.rfqById(7)).toBe("/api/v1/ic/rfqs/7");
    expect(IC_API_PATHS.rfqSubmit(7)).toBe("/api/v1/ic/rfqs/7/submit");
    expect(IC_API_PATHS.rfqConvert(7)).toBe("/api/v1/ic/rfqs/7/convert");
  });
});

describe("IC API schemas (P8A)", () => {
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

  it("parses notification list, mark-read, and unread responses", () => {
    const notification = icNotificationSchema.parse({
      companyId: 1,
      createdAt: "2026-07-01T00:00:00.000Z",
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

    const list = icNotificationsListResponseSchema.parse({
      data: [notification],
      success: true,
    });
    expect(list.data).toHaveLength(1);

    const unread = icUnreadCountResponseSchema.parse({
      data: { count: 3 },
      success: true,
    });
    expect(unread.data.count).toBe(3);

    const markedOne = icMarkNotificationReadResponseSchema.parse({
      data: { ...notification, isRead: true },
      success: true,
    });
    expect(markedOne.data.isRead).toBe(true);

    const markedAll = icMarkAllNotificationsReadResponseSchema.parse({
      data: { marked: 5 },
      success: true,
    });
    expect(markedAll.data.marked).toBe(5);
  });

  it("parses retry list and run-one result shapes", () => {
    const item = icRetryQueueItemSchema.parse({
      actionCode: "FLOW2_CREATE_AR_DRAFT",
      companyId: 1,
      docMappingId: 10,
      errorMessage: "timeout",
      maxRetry: 5,
      nextRetryAt: null,
      payloadJson: "{}",
      retryCount: 2,
      retryId: 99,
      sourceDocument: "PO:100",
      status: "WAITING",
      targetDocument: null,
    });
    expect(item.retryId).toBe(99);

    const list = icRetriesListResponseSchema.parse({
      data: [item],
      success: true,
    });
    expect(list.data[0]?.status).toBe("WAITING");

    const runOk = icRunRetryResponseSchema.parse({
      data: { item: { ...item, status: "SUCCESS" }, status: "success" },
      success: true,
    });
    expect(runOk.data.status).toBe("success");

    const runFailed = icRunRetryResponseSchema.parse({
      data: {
        errorMessage: "SL down",
        item: { ...item, status: "WAITING" },
        status: "failed",
      },
      success: true,
    });
    expect(runFailed.data.status).toBe("failed");

    const runDead = icRunRetryResponseSchema.parse({
      data: {
        errorMessage: "max retries",
        item: { ...item, status: "DEAD" },
        status: "dead",
      },
      success: true,
    });
    expect(runDead.data.status).toBe("dead");
  });

  it("parses RFQ DTO shapes for P8B readiness", () => {
    const rfq = icRfqHeaderSchema.parse({
      createdBy: "buyer",
      lines: [],
      pqDraftDocEntry: 5,
      pqDraftDocNum: 500,
      remarks: null,
      rfqId: 7,
      rfqNumber: "RFQ-0007",
      sourceCompanyId: 1,
      sourceCompanyName: "Buyer Co A",
      status: "DRAFT",
      targetCompanyId: 2,
      targetCompanyName: "Seller Co B",
      vendorCode: "V-IC-B",
    });
    expect(rfq.rfqNumber).toBe("RFQ-0007");
    expect(rfq.sourceCompanyName).toBe("Buyer Co A");
    expect(rfq.targetCompanyName).toBe("Seller Co B");
  });
});
