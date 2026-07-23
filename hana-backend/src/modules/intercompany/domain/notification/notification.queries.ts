import {
  getIcSqlClient,
  toBool,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcNotification } from "./notification.types";

export const mapNotificationRow = (row: Record<string, unknown>): IcNotification => ({
  companyId: toNumber(row.COMPANY_ID ?? row.companyId),
  createdAt:
    row.CREATED_AT === null || row.CREATED_AT === undefined ? null : toString(row.CREATED_AT),
  documentId:
    row.DOCUMENT_ID === null || row.DOCUMENT_ID === undefined ? null : toString(row.DOCUMENT_ID),
  documentType: toString(row.DOCUMENT_TYPE ?? row.documentType),
  flowStep: row.FLOW_STEP === null || row.FLOW_STEP === undefined ? null : toString(row.FLOW_STEP),
  isRead: toBool(row.IS_READ ?? row.isRead),
  message: row.MESSAGE === null || row.MESSAGE === undefined ? null : toString(row.MESSAGE),
  notificationId: toNumber(row.NOTIFICATION_ID ?? row.notificationId),
  priority: toString(row.PRIORITY ?? row.priority, "MEDIUM"),
  title: toString(row.TITLE ?? row.title),
});

export type NotificationQueries = {
  listForCompany: (companyId: number, opts?: { unreadOnly?: boolean }) => Promise<IcNotification[]>;
  countUnreadForCompany: (companyId: number) => Promise<number>;
  findById: (notificationId: number) => Promise<IcNotification | null>;
};

export const createNotificationQueries = (
  sql: IcSqlClient = getIcSqlClient(),
): NotificationQueries => ({
  countUnreadForCompany: async (companyId) => {
    const rows = await sql.query(
      `SELECT COUNT(*) AS "CNT"
         FROM "IC_NOTIFICATION"
        WHERE "COMPANY_ID" = ?
          AND "IS_READ" = 0`,
      [companyId],
    );
    return toNumber(rows[0]?.CNT ?? rows[0]?.cnt);
  },

  findById: async (notificationId) => {
    const rows = await sql.query(`SELECT * FROM "IC_NOTIFICATION" WHERE "NOTIFICATION_ID" = ?`, [
      notificationId,
    ]);
    return rows[0] ? mapNotificationRow(rows[0]) : null;
  },

  listForCompany: async (companyId, opts) => {
    if (opts?.unreadOnly) {
      const rows = await sql.query(
        `SELECT * FROM "IC_NOTIFICATION"
          WHERE "COMPANY_ID" = ? AND "IS_READ" = 0
          ORDER BY "NOTIFICATION_ID" DESC`,
        [companyId],
      );
      return rows.map(mapNotificationRow);
    }
    const rows = await sql.query(
      `SELECT * FROM "IC_NOTIFICATION"
        WHERE "COMPANY_ID" = ?
        ORDER BY "NOTIFICATION_ID" DESC`,
      [companyId],
    );
    return rows.map(mapNotificationRow);
  },
});

export const notificationQueries = createNotificationQueries();
