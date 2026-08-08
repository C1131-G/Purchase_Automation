import {
  getIcSqlClient,
  insertAndReadIdentity,
  toNumber,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import { mapNotificationRow } from "./notification.queries";
import type { CreateNotificationInput, IcNotification } from "./notification.types";

export type NotificationMutations = {
  insert: (input: CreateNotificationInput) => Promise<IcNotification>;
  /** Company-scoped: only updates rows owned by `companyId`. */
  markRead: (notificationId: number, companyId: number) => Promise<IcNotification | null>;
  /** Marks all unread rows for a company; returns how many rows flipped. */
  markAllReadForCompany: (companyId: number) => Promise<number>;
};

const loadById = async (
  sql: IcSqlClient,
  notificationId: number,
): Promise<IcNotification | null> => {
  if (notificationId <= 0) {
    return null;
  }
  const rows = await sql.query(`SELECT * FROM "IC_NOTIFICATION" WHERE "NOTIFICATION_ID" = ?`, [
    notificationId,
  ]);
  return rows[0] ? mapNotificationRow(rows[0]) : null;
};

/**
 * Pool-safe reload when identity cannot be read: most recent matching row.
 * CURRENT_IDENTITY_VALUE is connection-scoped; if insert committed on another
 * connection this still finds the row after a successful INSERT.
 */
const loadLatestMatch = async (
  sql: IcSqlClient,
  input: CreateNotificationInput,
): Promise<IcNotification | null> => {
  const rows = await sql.query(
    `SELECT TOP 1 * FROM "IC_NOTIFICATION"
      WHERE "COMPANY_ID" = ?
        AND "DOCUMENT_TYPE" = ?
        AND COALESCE("DOCUMENT_ID", '') = COALESCE(?, '')
        AND COALESCE("FLOW_STEP", '') = COALESCE(?, '')
      ORDER BY "NOTIFICATION_ID" DESC`,
    [input.companyId, input.documentType, input.documentId ?? null, input.flowStep ?? null],
  );
  return rows[0] ? mapNotificationRow(rows[0]) : null;
};

export const createNotificationMutations = (
  sql: IcSqlClient = getIcSqlClient(),
): NotificationMutations => ({
  insert: async (input) => {
    const notificationId = await insertAndReadIdentity(
      sql,
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

    const created = (await loadById(sql, notificationId)) ?? (await loadLatestMatch(sql, input));
    if (!created) {
      throw new Error(`IC_NOTIFICATION insert failed id=${notificationId}`);
    }
    return created;
  },

  markAllReadForCompany: async (companyId) => {
    const before = await sql.query(
      `SELECT COUNT(*) AS "CNT"
         FROM "IC_NOTIFICATION"
        WHERE "COMPANY_ID" = ?
          AND "IS_READ" = 0`,
      [companyId],
    );
    const marked = toNumber(before[0]?.CNT ?? before[0]?.cnt);
    if (marked <= 0) {
      return 0;
    }
    await sql.query(
      `UPDATE "IC_NOTIFICATION"
          SET "IS_READ" = 1
        WHERE "COMPANY_ID" = ?
          AND "IS_READ" = 0`,
      [companyId],
    );
    return marked;
  },

  markRead: async (notificationId, companyId) => {
    await sql.query(
      `UPDATE "IC_NOTIFICATION"
          SET "IS_READ" = 1
        WHERE "NOTIFICATION_ID" = ?
          AND "COMPANY_ID" = ?`,
      [notificationId, companyId],
    );
    const rows = await sql.query(
      `SELECT * FROM "IC_NOTIFICATION"
        WHERE "NOTIFICATION_ID" = ?
          AND "COMPANY_ID" = ?`,
      [notificationId, companyId],
    );
    return rows[0] ? mapNotificationRow(rows[0]) : null;
  },
});

export const notificationMutations = createNotificationMutations();
