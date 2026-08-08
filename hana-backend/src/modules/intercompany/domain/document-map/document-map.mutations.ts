import {
  getIcSqlClient,
  insertAndReadIdentity,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import { mapDocumentMapRow } from "./document-map.queries";
import type { CreateDocumentMapInput, IcDocumentMap } from "./document-map.types";

export type DocumentMapMutations = {
  insert: (input: CreateDocumentMapInput) => Promise<IcDocumentMap>;
  updateStatus: (
    mappingId: number,
    status: string,
    patch?: {
      errorMessage?: string | null;
      targetDocEntry?: string | null;
      targetDocNum?: string | null;
      targetObject?: string | null;
    },
  ) => Promise<IcDocumentMap | null>;
};

const fetchById = async (sql: IcSqlClient, mappingId: number): Promise<IcDocumentMap | null> => {
  const rows = await sql.query(`SELECT * FROM "IC_DOCUMENT_MAPPING" WHERE "MAPPING_ID" = ?`, [
    mappingId,
  ]);
  return rows[0] ? mapDocumentMapRow(rows[0]) : null;
};

export const createDocumentMapMutations = (
  sql: IcSqlClient = getIcSqlClient(),
): DocumentMapMutations => ({
  insert: async (input) => {
    const mappingId = await insertAndReadIdentity(
      sql,
      `INSERT INTO "IC_DOCUMENT_MAPPING"
        ("SOURCE_COMPANY_ID","TARGET_COMPANY_ID","SOURCE_OBJECT","SOURCE_DOC_ENTRY",
         "SOURCE_DOC_NUM","TARGET_OBJECT","TARGET_DOC_ENTRY","TARGET_DOC_NUM",
         "STATUS","ERROR_MESSAGE","SOURCE_REMARKS_TAG")
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        input.sourceCompanyId,
        input.targetCompanyId ?? null,
        input.sourceObject,
        input.sourceDocEntry,
        input.sourceDocNum ?? null,
        input.targetObject ?? null,
        input.targetDocEntry ?? null,
        input.targetDocNum ?? null,
        input.status ?? "PENDING",
        input.errorMessage ?? null,
        input.sourceRemarksTag ?? null,
      ],
    );
    const created = await fetchById(sql, mappingId);
    if (!created) {
      throw new Error(`IC_DOCUMENT_MAPPING insert failed to reload id=${mappingId}`);
    }
    return created;
  },

  updateStatus: async (mappingId, status, patch = {}) => {
    await sql.query(
      `UPDATE "IC_DOCUMENT_MAPPING"
          SET "STATUS" = ?,
              "ERROR_MESSAGE" = COALESCE(?, "ERROR_MESSAGE"),
              "TARGET_DOC_ENTRY" = COALESCE(?, "TARGET_DOC_ENTRY"),
              "TARGET_DOC_NUM" = COALESCE(?, "TARGET_DOC_NUM"),
              "TARGET_OBJECT" = COALESCE(?, "TARGET_OBJECT"),
              "UPDATED_AT" = CURRENT_TIMESTAMP
        WHERE "MAPPING_ID" = ?`,
      [
        status,
        patch.errorMessage ?? null,
        patch.targetDocEntry ?? null,
        patch.targetDocNum ?? null,
        patch.targetObject ?? null,
        mappingId,
      ],
    );
    return fetchById(sql, mappingId);
  },
});

export const documentMapMutations = createDocumentMapMutations();
