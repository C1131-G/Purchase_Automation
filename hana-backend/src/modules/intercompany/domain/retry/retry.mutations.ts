import {
  DEFAULT_MAX_RETRY,
  IC_RETRY_STATUS,
} from "@/modules/intercompany/infrastructure/constants";
import {
  getIcSqlClient,
  toNumber,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import { mapRetryRow } from "./retry.queries";
import type { EnqueueRetryInput, IcRetryQueueItem } from "./retry.types";

export type RetryMutations = {
  insert: (input: EnqueueRetryInput) => Promise<IcRetryQueueItem>;
  claim: (retryId: number) => Promise<IcRetryQueueItem | null>;
  markSuccess: (retryId: number) => Promise<IcRetryQueueItem | null>;
  markFailedOrDead: (retryId: number, errorMessage: string) => Promise<IcRetryQueueItem | null>;
};

const fetch = async (sql: IcSqlClient, retryId: number) => {
  const rows = await sql.query(`SELECT * FROM "IC_RETRY_QUEUE" WHERE "RETRY_ID" = ?`, [retryId]);
  return rows[0] ? mapRetryRow(rows[0]) : null;
};

export const createRetryMutations = (sql: IcSqlClient = getIcSqlClient()): RetryMutations => ({
  claim: async (retryId) => {
    await sql.query(
      `UPDATE "IC_RETRY_QUEUE"
          SET "STATUS" = ?, "UPDATED_AT" = CURRENT_TIMESTAMP
        WHERE "RETRY_ID" = ? AND "STATUS" = ?`,
      [IC_RETRY_STATUS.PROCESSING, retryId, IC_RETRY_STATUS.WAITING],
    );
    return fetch(sql, retryId);
  },

  insert: async (input) => {
    await sql.query(
      `INSERT INTO "IC_RETRY_QUEUE"
        ("COMPANY_ID","DOC_MAPPING_ID","SOURCE_DOCUMENT","TARGET_DOCUMENT",
         "ACTION_CODE","PAYLOAD_JSON","ERROR_MESSAGE","RETRY_COUNT","MAX_RETRY",
         "NEXT_RETRY_AT","STATUS")
       VALUES (?,?,?,?,?,?,?,0,?,?,'WAITING')`,
      [
        input.companyId,
        input.docMappingId ?? null,
        input.sourceDocument,
        input.targetDocument ?? null,
        input.actionCode,
        input.payloadJson ?? null,
        input.errorMessage ?? null,
        input.maxRetry ?? DEFAULT_MAX_RETRY,
        input.nextRetryAt ?? null,
      ],
    );
    const idRows = await sql.query(`SELECT CURRENT_IDENTITY_VALUE() AS "ID" FROM DUMMY`);
    const retryId = toNumber(idRows[0]?.ID ?? idRows[0]?.id);
    const created = await fetch(sql, retryId);
    if (!created) {
      throw new Error(`IC_RETRY_QUEUE insert failed id=${retryId}`);
    }
    return created;
  },

  markFailedOrDead: async (retryId, errorMessage) => {
    const current = await fetch(sql, retryId);
    if (!current) {
      return null;
    }
    const nextCount = current.retryCount + 1;
    const dead = nextCount >= current.maxRetry;
    await sql.query(
      `UPDATE "IC_RETRY_QUEUE"
          SET "RETRY_COUNT" = ?,
              "ERROR_MESSAGE" = ?,
              "STATUS" = ?,
              "NEXT_RETRY_AT" = CASE WHEN ? = 1 THEN NULL ELSE ADD_SECONDS(CURRENT_TIMESTAMP, 300) END,
              "UPDATED_AT" = CURRENT_TIMESTAMP
        WHERE "RETRY_ID" = ?`,
      [
        nextCount,
        errorMessage,
        dead ? IC_RETRY_STATUS.DEAD : IC_RETRY_STATUS.WAITING,
        dead ? 1 : 0,
        retryId,
      ],
    );
    return fetch(sql, retryId);
  },

  markSuccess: async (retryId) => {
    await sql.query(
      `UPDATE "IC_RETRY_QUEUE"
          SET "STATUS" = ?, "UPDATED_AT" = CURRENT_TIMESTAMP
        WHERE "RETRY_ID" = ?`,
      [IC_RETRY_STATUS.SUCCESS, retryId],
    );
    return fetch(sql, retryId);
  },
});

export const retryMutations = createRetryMutations();
