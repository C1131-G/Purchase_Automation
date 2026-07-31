import { describe, expect, it } from "vitest";

import {
  getIcNotificationPrimaryLink,
  parseIcNotificationDocLinks,
} from "@/features/intercompany/utils/ic-notification-navigation";
import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";

const baseNotification = (overrides: Partial<IcNotification>): IcNotification => ({
  companyId: 1,
  createdAt: "2026-01-01T00:00:00Z",
  documentId: null,
  documentType: "RFQ",
  flowStep: null,
  isRead: false,
  message: null,
  notificationId: 1,
  priority: "MEDIUM",
  title: "Partner",
  ...overrides,
});

describe("ic-notification-navigation", () => {
  it("links seller RFQ notification to RFQ create page", () => {
    const notification = baseNotification({
      documentId: "42",
      documentType: "RFQ",
      flowStep: "FLOW1_RFQ_CREATED",
      message: "AJAX Industries created RFQ 10042",
    });

    const links = parseIcNotificationDocLinks(notification);
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((link) => link.to === "/sales/request-for-quotations/$rfqId")).toBe(true);

    const primary = getIcNotificationPrimaryLink(notification);
    expect(primary?.params).toEqual({ rfqId: "42" });
    expect(primary?.search?.highlightDocNum).toBe("10042");
  });

  it("links buyer PQ notification to PQ update page", () => {
    const notification = baseNotification({
      documentId: "2042",
      documentType: "PQ",
      flowStep: "FLOW1_PQ_CREATED",
      message: "AJAX Industries · PQ No 2042",
    });

    const primary = getIcNotificationPrimaryLink(notification);
    expect(primary?.to).toBe("/purchase/quotations/$docNum/update");
    expect(primary?.params).toEqual({ docNum: "2042" });
    expect(primary?.search?.highlightDocNum).toBe("2042");
  });

  it("links seller SQ notification to SQ update page", () => {
    const notification = baseNotification({
      documentId: "810",
      documentType: "SQ",
      flowStep: "FLOW1_SQ_CREATED",
      message: "AJAX Industries · SQ No 810",
    });

    const primary = getIcNotificationPrimaryLink(notification);
    expect(primary?.to).toBe("/sales/quotations/$docNum/update");
    expect(primary?.params).toEqual({ docNum: "810" });
    expect(primary?.search?.highlightDocNum).toBe("810");
  });
});
