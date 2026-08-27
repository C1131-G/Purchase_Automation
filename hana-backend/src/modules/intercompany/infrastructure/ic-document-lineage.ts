import { config } from "@/config/env";

export type IcLineageSide = "buyer" | "seller";

const quoteIdentifier = (value: string): string => `"${value.replaceAll('"', '""')}"`;

/**
 * Builds the one-row-per-PQ IC chain used by document list queries.
 * The caller supplies the tenant DB name as the only query parameter.
 */
export const buildIcDocumentLineageSql = (side: IcLineageSide): string => {
  const common = quoteIdentifier(config.hana.commonDb);
  const tenantColumn = side === "buyer" ? `"buyer"."SAP_DB_NAME"` : `"seller"."SAP_DB_NAME"`;

  return `
    SELECT
      "pq_rfq"."SOURCE_DOC_ENTRY" AS "PqDocEntry",
      "pq_rfq"."TARGET_DOC_NUM" AS "RfqNumber",
      "rfq_sq"."TARGET_DOC_ENTRY" AS "SqDocEntry",
      "rfq_sq"."TARGET_DOC_NUM" AS "SqDocNum",
      "pq_po"."TARGET_DOC_ENTRY" AS "PoDocEntry",
      "pq_po"."TARGET_DOC_NUM" AS "PoDocNum"
    FROM (
      SELECT "SOURCE_COMPANY_ID", "SOURCE_DOC_ENTRY", "TARGET_DOC_ENTRY", "TARGET_DOC_NUM",
             ROW_NUMBER() OVER (
               PARTITION BY "SOURCE_COMPANY_ID", "SOURCE_DOC_ENTRY"
               ORDER BY "MAPPING_ID" DESC
             ) AS "rn"
      FROM ${common}."IC_DOCUMENT_MAPPING"
      WHERE "SOURCE_OBJECT" = 'PQ'
        AND "TARGET_OBJECT" = 'RFQ'
        AND "STATUS" = 'SUCCESS'
    ) "pq_rfq"
    JOIN ${common}."IC_COMPANY" "buyer"
      ON "buyer"."COMPANY_ID" = "pq_rfq"."SOURCE_COMPANY_ID"
    LEFT JOIN (
      SELECT "SOURCE_COMPANY_ID", "SOURCE_DOC_ENTRY", "TARGET_COMPANY_ID",
             "TARGET_DOC_ENTRY", "TARGET_DOC_NUM",
             ROW_NUMBER() OVER (
               PARTITION BY "SOURCE_COMPANY_ID", "SOURCE_DOC_ENTRY", "TARGET_COMPANY_ID"
               ORDER BY "MAPPING_ID" DESC
             ) AS "rn"
      FROM ${common}."IC_DOCUMENT_MAPPING"
      WHERE "SOURCE_OBJECT" = 'RFQ'
        AND "TARGET_OBJECT" = 'SQ'
        AND "STATUS" = 'SUCCESS'
    ) "rfq_sq"
      ON "rfq_sq"."SOURCE_COMPANY_ID" = "pq_rfq"."SOURCE_COMPANY_ID"
     AND "rfq_sq"."SOURCE_DOC_ENTRY" = "pq_rfq"."TARGET_DOC_ENTRY"
     AND "rfq_sq"."rn" = 1
    LEFT JOIN ${common}."IC_COMPANY" "seller"
      ON "seller"."COMPANY_ID" = "rfq_sq"."TARGET_COMPANY_ID"
    LEFT JOIN (
      SELECT "SOURCE_COMPANY_ID", "SOURCE_DOC_ENTRY", "TARGET_DOC_ENTRY", "TARGET_DOC_NUM",
             ROW_NUMBER() OVER (
               PARTITION BY "SOURCE_COMPANY_ID", "SOURCE_DOC_ENTRY"
               ORDER BY "MAPPING_ID" DESC
             ) AS "rn"
      FROM ${common}."IC_DOCUMENT_MAPPING"
      WHERE "SOURCE_OBJECT" = 'PQ'
        AND "TARGET_OBJECT" = 'PO'
        AND "STATUS" = 'SUCCESS'
    ) "pq_po"
      ON "pq_po"."SOURCE_COMPANY_ID" = "pq_rfq"."SOURCE_COMPANY_ID"
     AND "pq_po"."SOURCE_DOC_ENTRY" = "pq_rfq"."SOURCE_DOC_ENTRY"
     AND "pq_po"."rn" = 1
    WHERE "pq_rfq"."rn" = 1
      AND ${tenantColumn} = ?
  `;
};
