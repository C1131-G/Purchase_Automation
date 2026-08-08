import {
  getIcSqlClient,
  insertAndReadIdentity,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { AppendHistoryInput, IcSyncHistory } from "./history.types";

export type HistoryMutations = {
  insert: (input: AppendHistoryInput) => Promise<IcSyncHistory>;
};

export const createHistoryMutations = (sql: IcSqlClient = getIcSqlClient()): HistoryMutations => ({
  insert: async (input) => {
    const syncId = await insertAndReadIdentity(
      sql,
      `INSERT INTO "IC_SYNC_HISTORY"
        ("COMPANY_ID","ACTION","DOCUMENT_TYPE","DOCUMENT_ENTRY","STATUS","DURATION_MS","RESPONSE_JSON")
       VALUES (?,?,?,?,?,?,?)`,
      [
        input.companyId,
        input.action,
        input.documentType ?? null,
        input.documentEntry ?? null,
        input.status,
        input.durationMs ?? null,
        input.responseJson ?? null,
      ],
    );
    return {
      action: input.action,
      companyId: input.companyId,
      documentEntry: input.documentEntry ?? null,
      documentType: input.documentType ?? null,
      durationMs: input.durationMs ?? null,
      responseJson: input.responseJson ?? null,
      status: input.status,
      syncId,
    };
  },
});

export const historyMutations = createHistoryMutations();
