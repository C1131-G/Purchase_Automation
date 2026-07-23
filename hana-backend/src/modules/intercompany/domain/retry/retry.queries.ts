import {
  getIcSqlClient,
  toNullableNumber,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcRetryQueueItem } from "./retry.types";

export const mapRetryRow = (row: Record<string, unknown>): IcRetryQueueItem => ({
  actionCode: toString(row.ACTION_CODE ?? row.actionCode),
  companyId: toNumber(row.COMPANY_ID ?? row.companyId),
  docMappingId: toNullableNumber(row.DOC_MAPPING_ID ?? row.docMappingId),
  errorMessage:
    row.ERROR_MESSAGE === null || row.ERROR_MESSAGE === undefined
      ? null
      : toString(row.ERROR_MESSAGE),
  maxRetry: toNumber(row.MAX_RETRY ?? row.maxRetry),
  nextRetryAt:
    row.NEXT_RETRY_AT === null || row.NEXT_RETRY_AT === undefined
      ? null
      : toString(row.NEXT_RETRY_AT),
  payloadJson:
    row.PAYLOAD_JSON === null || row.PAYLOAD_JSON === undefined ? null : toString(row.PAYLOAD_JSON),
  retryCount: toNumber(row.RETRY_COUNT ?? row.retryCount),
  retryId: toNumber(row.RETRY_ID ?? row.retryId),
  sourceDocument: toString(row.SOURCE_DOCUMENT ?? row.sourceDocument),
  status: toString(row.STATUS ?? row.status),
  targetDocument:
    row.TARGET_DOCUMENT === null || row.TARGET_DOCUMENT === undefined
      ? null
      : toString(row.TARGET_DOCUMENT),
});

export type RetryQueries = {
  findDue: (limit?: number) => Promise<IcRetryQueueItem[]>;
  findById: (retryId: number) => Promise<IcRetryQueueItem | null>;
};

export const createRetryQueries = (sql: IcSqlClient = getIcSqlClient()): RetryQueries => ({
  findById: async (retryId) => {
    const rows = await sql.query(`SELECT * FROM "IC_RETRY_QUEUE" WHERE "RETRY_ID" = ?`, [retryId]);
    return rows[0] ? mapRetryRow(rows[0]) : null;
  },

  findDue: async (limit = 50) => {
    const rows = await sql.query(
      `SELECT * FROM "IC_RETRY_QUEUE"
        WHERE "STATUS" = 'WAITING'
          AND ("NEXT_RETRY_AT" IS NULL OR "NEXT_RETRY_AT" <= CURRENT_TIMESTAMP)
        ORDER BY "RETRY_ID" ASC`,
    );
    return rows.slice(0, limit).map(mapRetryRow);
  },
});

export const retryQueries = createRetryQueries();
