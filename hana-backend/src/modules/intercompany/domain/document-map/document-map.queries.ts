import {
  getIcSqlClient,
  toNullableNumber,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcDocumentMap } from "./document-map.types";

export const mapDocumentMapRow = (row: Record<string, unknown>): IcDocumentMap => ({
  errorMessage:
    row.ERROR_MESSAGE === null || row.ERROR_MESSAGE === undefined
      ? null
      : toString(row.ERROR_MESSAGE),
  mappingId: toNumber(row.MAPPING_ID ?? row.mappingId),
  sourceCompanyId: toNumber(row.SOURCE_COMPANY_ID ?? row.sourceCompanyId),
  sourceDocEntry: toString(row.SOURCE_DOC_ENTRY ?? row.sourceDocEntry),
  sourceDocNum:
    row.SOURCE_DOC_NUM === null || row.SOURCE_DOC_NUM === undefined
      ? null
      : toString(row.SOURCE_DOC_NUM),
  sourceObject: toString(row.SOURCE_OBJECT ?? row.sourceObject),
  sourceRemarksTag:
    row.SOURCE_REMARKS_TAG === null || row.SOURCE_REMARKS_TAG === undefined
      ? null
      : toString(row.SOURCE_REMARKS_TAG),
  status: toString(row.STATUS ?? row.status),
  targetCompanyId: toNullableNumber(row.TARGET_COMPANY_ID ?? row.targetCompanyId),
  targetDocEntry:
    row.TARGET_DOC_ENTRY === null || row.TARGET_DOC_ENTRY === undefined
      ? null
      : toString(row.TARGET_DOC_ENTRY),
  targetDocNum:
    row.TARGET_DOC_NUM === null || row.TARGET_DOC_NUM === undefined
      ? null
      : toString(row.TARGET_DOC_NUM),
  targetObject:
    row.TARGET_OBJECT === null || row.TARGET_OBJECT === undefined
      ? null
      : toString(row.TARGET_OBJECT),
});

export type DocumentMapQueries = {
  findBySource: (params: {
    sourceCompanyId: number;
    sourceObject: string;
    sourceDocEntry: string;
    targetObject?: string | null;
  }) => Promise<IcDocumentMap | null>;
  findByTarget: (params: {
    targetCompanyId: number;
    targetObject: string;
    targetDocEntry: string;
    sourceObject?: string | null;
  }) => Promise<IcDocumentMap | null>;
  findById: (mappingId: number) => Promise<IcDocumentMap | null>;
};

export const createDocumentMapQueries = (
  sql: IcSqlClient = getIcSqlClient(),
): DocumentMapQueries => ({
  findById: async (mappingId) => {
    const rows = await sql.query(`SELECT * FROM "IC_DOCUMENT_MAPPING" WHERE "MAPPING_ID" = ?`, [
      mappingId,
    ]);
    return rows[0] ? mapDocumentMapRow(rows[0]) : null;
  },

  findBySource: async ({ sourceCompanyId, sourceObject, sourceDocEntry, targetObject }) => {
    if (targetObject) {
      const rows = await sql.query(
        `SELECT * FROM "IC_DOCUMENT_MAPPING"
          WHERE "SOURCE_COMPANY_ID" = ?
            AND "SOURCE_OBJECT" = ?
            AND "SOURCE_DOC_ENTRY" = ?
            AND "TARGET_OBJECT" = ?`,
        [sourceCompanyId, sourceObject, sourceDocEntry, targetObject],
      );
      return rows[0] ? mapDocumentMapRow(rows[0]) : null;
    }
    const rows = await sql.query(
      `SELECT * FROM "IC_DOCUMENT_MAPPING"
        WHERE "SOURCE_COMPANY_ID" = ?
          AND "SOURCE_OBJECT" = ?
          AND "SOURCE_DOC_ENTRY" = ?
        ORDER BY "MAPPING_ID" DESC`,
      [sourceCompanyId, sourceObject, sourceDocEntry],
    );
    return rows[0] ? mapDocumentMapRow(rows[0]) : null;
  },

  findByTarget: async ({ targetCompanyId, targetObject, targetDocEntry, sourceObject }) => {
    if (sourceObject) {
      const rows = await sql.query(
        `SELECT * FROM "IC_DOCUMENT_MAPPING"
          WHERE "TARGET_COMPANY_ID" = ?
            AND "TARGET_OBJECT" = ?
            AND "TARGET_DOC_ENTRY" = ?
            AND "SOURCE_OBJECT" = ?
          ORDER BY "MAPPING_ID" DESC`,
        [targetCompanyId, targetObject, targetDocEntry, sourceObject],
      );
      return rows[0] ? mapDocumentMapRow(rows[0]) : null;
    }
    const rows = await sql.query(
      `SELECT * FROM "IC_DOCUMENT_MAPPING"
        WHERE "TARGET_COMPANY_ID" = ?
          AND "TARGET_OBJECT" = ?
          AND "TARGET_DOC_ENTRY" = ?
        ORDER BY "MAPPING_ID" DESC`,
      [targetCompanyId, targetObject, targetDocEntry],
    );
    return rows[0] ? mapDocumentMapRow(rows[0]) : null;
  },
});

export const documentMapQueries = createDocumentMapQueries();
