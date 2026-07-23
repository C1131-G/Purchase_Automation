import {
  getIcSqlClient,
  toNumber,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import { mapNotificationRow } from "./notification.queries";
import type { CreateNotificationInput, IcNotification } from "./notification.types";

export type NotificationMutations = {
  insert: (input: CreateNotificationInput) => Promise<IcNotification>;
  markRead: (notificationId: number) => Promise<IcNotification | null>;
};

export const createNotificationMutations = (
  sql: IcSqlClient = getIcSqlClient(),
): NotificationMutations => ({
  insert: async (input) => {
    await sql.query(
      `INSERT INTO "IC_NOTIFICATION"
        ("COMPANY_ID","DOCUMENT_TYPE","DOCUMENT_ID","TITLE","MESSAGE","PRIORITY","IS_READ","FLOW_STEP")
       VALUES (?,?,?,?,?,?,0,?)`,
      [
        input.companyId,
        input.documentType,
        input.documentId ?? null,
        input.title,
        input.message ?? null,
        input.priority ?? "MEDIUM",
        input.flowStep ?? null,
      ],
    );
    const idRows = await sql.query(`SELECT CURRENT_IDENTITY_VALUE() AS "ID" FROM DUMMY`);
    const notificationId = toNumber(idRows[0]?.ID ?? idRows[0]?.id);
    const rows = await sql.query(`SELECT * FROM "IC_NOTIFICATION" WHERE "NOTIFICATION_ID" = ?`, [
      notificationId,
    ]);
    if (!rows[0]) {
      throw new Error(`IC_NOTIFICATION insert failed id=${notificationId}`);
    }
    return mapNotificationRow(rows[0]);
  },

  markRead: async (notificationId) => {
    await sql.query(`UPDATE "IC_NOTIFICATION" SET "IS_READ" = 1 WHERE "NOTIFICATION_ID" = ?`, [
      notificationId,
    ]);
    const rows = await sql.query(`SELECT * FROM "IC_NOTIFICATION" WHERE "NOTIFICATION_ID" = ?`, [
      notificationId,
    ]);
    return rows[0] ? mapNotificationRow(rows[0]) : null;
  },
});

export const notificationMutations = createNotificationMutations();
