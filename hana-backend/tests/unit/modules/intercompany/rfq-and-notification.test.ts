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
    db.tables.IC_COMPANY.push(
      {
        COMPANY_CODE: "A",
        COMPANY_ID: 1,
        COMPANY_NAME: "Buyer Co A",
        IS_ACTIVE: 1,
        SAP_DB_NAME: "DB_A",
      },
      {
        COMPANY_CODE: "B",
        COMPANY_ID: 2,
        COMPANY_NAME: "Seller Co B",
        IS_ACTIVE: 1,
        SAP_DB_NAME: "DB_B",
      },
    );
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
    expect(created.sourceCompanyName).toBe("Buyer Co A");
    expect(created.targetCompanyName).toBe("Seller Co B");

    const listed = await rfq.listForCompany(2);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.sourceCompanyName).toBe("Buyer Co A");
    expect(listed[0]?.targetCompanyName).toBe("Seller Co B");

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

    await notifications.markRead(n1.notificationId, 2);
    await expect(notifications.countUnreadForCompany(2)).resolves.toBe(1);
    await expect(notifications.countUnreadForCompany(1)).resolves.toBe(1);

    // Company isolation: wrong company cannot mark another company's row
    const other = await notifications.listForCompany(1);
    const otherId = other[0]?.notificationId;
    expect(otherId).toBeDefined();
    await expect(notifications.markRead(otherId!, 2)).resolves.toBeNull();
    await expect(notifications.countUnreadForCompany(1)).resolves.toBe(1);

    const marked = await notifications.markAllReadForCompany(2);
    expect(marked).toBe(1);
    await expect(notifications.countUnreadForCompany(2)).resolves.toBe(0);
    await expect(notifications.countUnreadForCompany(1)).resolves.toBe(1);

    const markedAgain = await notifications.markAllReadForCompany(2);
    expect(markedAgain).toBe(0);
  });
});
