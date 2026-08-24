import { createHash } from "node:crypto";

import {
  getIcSqlClient,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

export type IcRevisionService = {
  getForCompany: (companyId: number) => Promise<string>;
};

type RevisionParts = {
  rfqHeaderId: number;
  rfqHeaderUpdatedAt: string;
  rfqLineUpdatedAt: string;
  mappingId: number;
  mappingUpdatedAt: string;
  notificationId: number;
  retryId: number;
  retryUpdatedAt: string;
};

const value = (row: Record<string, unknown> | undefined, key: string): unknown =>
  row?.[key] ?? row?.[key.toLowerCase()];

const text = (row: Record<string, unknown> | undefined, key: string): string => {
  const item = value(row, key);
  return item === null || item === undefined ? "" : toString(item);
};

/**
 * Revision is derived only from common IC rows. It is intentionally opaque so
 * clients cannot infer document data from the polling response.
 */
export const createIcRevisionService = (
  sql: IcSqlClient = getIcSqlClient(),
): IcRevisionService => ({
  getForCompany: async (companyId) => {
    const [rfqRows, mappingRows, notificationRows, retryRows] = await Promise.all([
      sql.query(
        `SELECT MAX(h."RFQ_ID") AS "RFQ_ID",
                MAX(h."UPDATED_AT") AS "HEADER_UPDATED_AT",
                MAX(l."UPDATED_AT") AS "LINE_UPDATED_AT"
           FROM "IC_RFQ_HEADER" h
           LEFT JOIN "IC_RFQ_LINE" l ON l."RFQ_ID" = h."RFQ_ID"
          WHERE h."SOURCE_COMPANY_ID" = ? OR h."TARGET_COMPANY_ID" = ?`,
        [companyId, companyId],
      ),
      sql.query(
        `SELECT MAX("MAPPING_ID") AS "MAPPING_ID",
                MAX("UPDATED_AT") AS "UPDATED_AT"
           FROM "IC_DOCUMENT_MAPPING"
          WHERE "SOURCE_COMPANY_ID" = ? OR "TARGET_COMPANY_ID" = ?`,
        [companyId, companyId],
      ),
      sql.query(
        `SELECT MAX("NOTIFICATION_ID") AS "NOTIFICATION_ID"
           FROM "IC_NOTIFICATION"
          WHERE "COMPANY_ID" = ?`,
        [companyId],
      ),
      sql.query(
        `SELECT MAX("RETRY_ID") AS "RETRY_ID",
                MAX("UPDATED_AT") AS "UPDATED_AT"
           FROM "IC_RETRY_QUEUE"
          WHERE "COMPANY_ID" = ?`,
        [companyId],
      ),
    ]);

    const parts: RevisionParts = {
      rfqHeaderId: toNumber(value(rfqRows[0], "RFQ_ID")),
      rfqHeaderUpdatedAt: text(rfqRows[0], "HEADER_UPDATED_AT"),
      rfqLineUpdatedAt: text(rfqRows[0], "LINE_UPDATED_AT"),
      mappingId: toNumber(value(mappingRows[0], "MAPPING_ID")),
      mappingUpdatedAt: text(mappingRows[0], "UPDATED_AT"),
      notificationId: toNumber(value(notificationRows[0], "NOTIFICATION_ID")),
      retryId: toNumber(value(retryRows[0], "RETRY_ID")),
      retryUpdatedAt: text(retryRows[0], "UPDATED_AT"),
    };

    return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
  },
});

export const icRevisionService = createIcRevisionService();
