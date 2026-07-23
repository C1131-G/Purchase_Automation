import {
  getIcSqlClient,
  toNumber,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { AppendHistoryInput, IcSyncHistory } from "./history.types";

export type HistoryMutations = {
  insert: (input: AppendHistoryInput) => Promise<IcSyncHistory>;
};

export const createHistoryMutations = (sql: IcSqlClient = getIcSqlClient()): HistoryMutations => ({
  insert: async (input) => {
    await sql.query(
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
    const idRows = await sql.query(`SELECT CURRENT_IDENTITY_VALUE() AS "ID" FROM DUMMY`);
    const syncId = toNumber(idRows[0]?.ID ?? idRows[0]?.id);
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
