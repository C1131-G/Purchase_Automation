import {
  getIcSqlClient,
  toNumber,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcApiLog, WriteApiLogInput } from "./api-log.types";

const SECRET_KEYS = ["password", "Password", "SESSIONID", "B1SESSION", "Cookie"];

/** Mask secrets in JSON-ish strings before persist. */
export const maskSecrets = (raw: string | null | undefined): string | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  let out = raw;
  for (const key of SECRET_KEYS) {
    const secretPattern = new RegExp(`("${key}"\\s*:\\s*")([^"]*)(")`, "gi");
    out = out.replace(secretPattern, `$1***$3`);
  }
  return out;
};

export type ApiLogMutations = {
  insert: (input: WriteApiLogInput) => Promise<IcApiLog>;
};

export const createApiLogMutations = (sql: IcSqlClient = getIcSqlClient()): ApiLogMutations => ({
  insert: async (input) => {
    const requestJson = maskSecrets(input.requestJson);
    const responseJson = maskSecrets(input.responseJson);
    await sql.query(
      `INSERT INTO "IC_API_LOG"
        ("COMPANY_ID","METHOD","ENDPOINT","REQUEST_JSON","RESPONSE_JSON","STATUS_CODE")
       VALUES (?,?,?,?,?,?)`,
      [
        input.companyId ?? null,
        input.method,
        input.endpoint,
        requestJson,
        responseJson,
        input.statusCode ?? null,
      ],
    );
    const idRows = await sql.query(`SELECT CURRENT_IDENTITY_VALUE() AS "ID" FROM DUMMY`);
    return {
      companyId: input.companyId ?? null,
      endpoint: input.endpoint,
      logId: toNumber(idRows[0]?.ID ?? idRows[0]?.id),
      method: input.method,
      requestJson,
      responseJson,
      statusCode: input.statusCode ?? null,
    };
  },
});

export const apiLogMutations = createApiLogMutations();
