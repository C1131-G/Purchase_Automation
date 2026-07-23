import { describe, expect, it } from "vitest";

import { createNotificationMutations } from "@/modules/intercompany/domain/notification/notification.mutations";
import { createNotificationQueries } from "@/modules/intercompany/domain/notification/notification.queries";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createRfqMutations } from "@/modules/intercompany/domain/rfq/rfq.mutations";
import { createRfqQueries } from "@/modules/intercompany/domain/rfq/rfq.queries";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createMemoryDb, createMemorySqlClient } from "@/modules/intercompany/testing/memory-sql";

describe("rfq + notification (T3.6 / T3.7 / T3.7b)", () => {
  it("T3.6 RFQ create header + lines; idempotent per draft", async () => {
    const db = createMemoryDb();
    const sql = createMemorySqlClient(db);
    const rfq = createRfqService({
      mutations: createRfqMutations(sql),
      queries: createRfqQueries(sql),
    });

    const created = await rfq.createFromDraft({
      lines: [
        { itemCode: "ITEM1", lineNum: 0, quantity: 2 },
        { itemCode: "ITEM2", lineNum: 1, quantity: 5 },
      ],
      pqDraftDocEntry: 55,
      pqDraftDocNum: 9001,
      rfqNumber: "RFQ-55",
      sourceCompanyId: 1,
      targetCompanyId: 2,
      vendorCode: "V-B",
    });

    expect(created.rfqId).toBeGreaterThan(0);
    expect(created.lines).toHaveLength(2);
    expect(created.status).toBe("DRAFT");

    const again = await rfq.createFromDraft({
      lines: [{ itemCode: "X", lineNum: 0, quantity: 1 }],
      pqDraftDocEntry: 55,
      rfqNumber: "RFQ-55-dup",
      sourceCompanyId: 1,
      targetCompanyId: 2,
      vendorCode: "V-B",
    });
    expect(again.rfqId).toBe(created.rfqId);
    expect(db.tables.IC_RFQ_HEADER).toHaveLength(1);
  });

  it("T3.7 / T3.7b notification create, list, unread count, mark read", async () => {
    const db = createMemoryDb();
    const sql = createMemorySqlClient(db);
    const notifications = createNotificationService({
      mutations: createNotificationMutations(sql),
      queries: createNotificationQueries(sql),
    });

    const n1 = await notifications.create({
      companyId: 2,
      documentId: "1",
      documentType: "RFQ",
      flowStep: "FLOW1_RFQ_CREATED",
      title: "New RFQ",
    });
    await notifications.create({
      companyId: 2,
      documentType: "AR_DRAFT",
      title: "AR draft",
    });
    await notifications.create({
      companyId: 1,
      documentType: "RFQ",
      title: "Other company",
    });

    const list = await notifications.listForCompany(2);
    expect(list).toHaveLength(2);
    await expect(notifications.countUnreadForCompany(2)).resolves.toBe(2);

    await notifications.markRead(n1.notificationId);
    await expect(notifications.countUnreadForCompany(2)).resolves.toBe(1);
    await expect(notifications.countUnreadForCompany(1)).resolves.toBe(1);
  });
});
