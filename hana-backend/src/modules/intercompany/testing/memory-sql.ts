/**
 * In-memory SQL-ish client for offline unit tests (no HANA).
 * Supports the subset of statements used by IC domain/config modules.
 */

import type { IcSqlClient } from "@/modules/intercompany/infrastructure/ic-sql";

type Row = Record<string, unknown>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export type MemoryDb = {
  tables: Record<string, Row[]>;
  identities: Record<string, number>;
  lastIdentityTable: string | null;
};

export const createMemoryDb = (): MemoryDb => ({
  identities: {},
  lastIdentityTable: null,
  tables: {
    IC_API_LOG: [],
    IC_BP_MAPPING: [],
    IC_COMPANY: [],
    IC_CONFIGURATION: [],
    IC_DOCUMENT_MAPPING: [],
    IC_NOTIFICATION: [],
    IC_RETRY_QUEUE: [],
    IC_RFQ_HEADER: [],
    IC_RFQ_LINE: [],
    IC_SAP_CONNECTION: [],
    IC_SCHEDULER_JOB: [],
    IC_SL_SESSION: [],
    IC_SYNC_HISTORY: [],
  },
});

const nextId = (db: MemoryDb, table: string): number => {
  db.identities[table] = (db.identities[table] ?? 0) + 1;
  db.lastIdentityTable = table;
  return db.identities[table];
};

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();

/** Attach IC_COMPANY display names onto RFQ header rows (mirrors SQL LEFT JOIN). */
const withRfqCompanyNames = (db: MemoryDb, rows: Row[]): Row[] => {
  const companyById = new Map(
    db.tables.IC_COMPANY.map((row) => [Number(row.COMPANY_ID), row] as const),
  );
  return rows.map((row) => {
    const source = companyById.get(Number(row.SOURCE_COMPANY_ID));
    const target = companyById.get(Number(row.TARGET_COMPANY_ID));
    return {
      ...clone(row),
      SOURCE_COMPANY_NAME: source?.COMPANY_NAME ?? null,
      TARGET_COMPANY_NAME: target?.COMPANY_NAME ?? null,
    };
  });
};

export const createMemorySqlClient = (
  db: MemoryDb = createMemoryDb(),
): IcSqlClient & {
  db: MemoryDb;
} => ({
  db,
  query: async <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> => {
    const statement = normalizeSql(sql);

    if (statement.includes("SELECT CURRENT_IDENTITY_VALUE()")) {
      const table = db.lastIdentityTable;
      const id = table ? (db.identities[table] ?? 0) : 0;
      return [{ ID: id } as unknown as T];
    }

    if (statement.startsWith('SELECT * FROM "IC_DOCUMENT_MAPPING" WHERE "MAPPING_ID"')) {
      const id = Number(params[0]);
      return db.tables.IC_DOCUMENT_MAPPING.filter((row) => row.MAPPING_ID === id).map(clone) as T[];
    }

    if (
      statement.includes('FROM "IC_DOCUMENT_MAPPING"') &&
      statement.includes("TARGET_COMPANY_ID") &&
      statement.includes("SOURCE_OBJECT")
    ) {
      const [targetCompanyId, targetObject, targetDocEntry, sourceObject] = params;
      return db.tables.IC_DOCUMENT_MAPPING.filter(
        (row) =>
          row.TARGET_COMPANY_ID === targetCompanyId &&
          row.TARGET_OBJECT === targetObject &&
          row.TARGET_DOC_ENTRY === String(targetDocEntry) &&
          row.SOURCE_OBJECT === sourceObject,
      )
        .sort((left, right) => Number(right.MAPPING_ID) - Number(left.MAPPING_ID))
        .map(clone) as T[];
    }

    if (
      statement.includes('FROM "IC_DOCUMENT_MAPPING"') &&
      statement.includes("TARGET_COMPANY_ID")
    ) {
      const [targetCompanyId, targetObject, targetDocEntry] = params;
      return db.tables.IC_DOCUMENT_MAPPING.filter(
        (row) =>
          row.TARGET_COMPANY_ID === targetCompanyId &&
          row.TARGET_OBJECT === targetObject &&
          row.TARGET_DOC_ENTRY === String(targetDocEntry),
      )
        .sort((left, right) => Number(right.MAPPING_ID) - Number(left.MAPPING_ID))
        .map(clone) as T[];
    }

    if (
      statement.includes('FROM "IC_DOCUMENT_MAPPING"') &&
      statement.includes("SOURCE_COMPANY_ID") &&
      statement.includes("TARGET_OBJECT")
    ) {
      const [sourceCompanyId, sourceObject, sourceDocEntry, targetObject] = params;
      return db.tables.IC_DOCUMENT_MAPPING.filter(
        (row) =>
          row.SOURCE_COMPANY_ID === sourceCompanyId &&
          row.SOURCE_OBJECT === sourceObject &&
          row.SOURCE_DOC_ENTRY === String(sourceDocEntry) &&
          row.TARGET_OBJECT === targetObject,
      )
        .sort((left, right) => {
          const statusRank = (row: Row) => (row.STATUS === "SUCCESS" ? 0 : 1);
          const targetRank = (row: Row) =>
            row.TARGET_DOC_ENTRY != null && String(row.TARGET_DOC_ENTRY).trim() !== "" ? 0 : 1;
          return (
            statusRank(left) - statusRank(right) ||
            targetRank(left) - targetRank(right) ||
            Number(right.MAPPING_ID) - Number(left.MAPPING_ID)
          );
        })
        .map(clone) as T[];
    }

    if (
      statement.includes('FROM "IC_DOCUMENT_MAPPING"') &&
      statement.includes("SOURCE_COMPANY_ID")
    ) {
      const [sourceCompanyId, sourceObject, sourceDocEntry] = params;
      return db.tables.IC_DOCUMENT_MAPPING.filter(
        (row) =>
          row.SOURCE_COMPANY_ID === sourceCompanyId &&
          row.SOURCE_OBJECT === sourceObject &&
          row.SOURCE_DOC_ENTRY === String(sourceDocEntry),
      )
        .sort((left, right) => {
          const statusRank = (row: Row) => (row.STATUS === "SUCCESS" ? 0 : 1);
          const targetRank = (row: Row) =>
            row.TARGET_DOC_ENTRY != null && String(row.TARGET_DOC_ENTRY).trim() !== "" ? 0 : 1;
          return (
            statusRank(left) - statusRank(right) ||
            targetRank(left) - targetRank(right) ||
            Number(right.MAPPING_ID) - Number(left.MAPPING_ID)
          );
        })
        .map(clone) as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_DOCUMENT_MAPPING"')) {
      const id = nextId(db, "IC_DOCUMENT_MAPPING");
      db.tables.IC_DOCUMENT_MAPPING.push({
        ERROR_MESSAGE: params[9] ?? null,
        MAPPING_ID: id,
        SOURCE_COMPANY_ID: params[0],
        SOURCE_DOC_ENTRY: String(params[3]),
        SOURCE_DOC_NUM: params[4] ?? null,
        SOURCE_OBJECT: params[2],
        SOURCE_REMARKS_TAG: params[10] ?? null,
        STATUS: params[8] ?? "PENDING",
        TARGET_COMPANY_ID: params[1] ?? null,
        TARGET_DOC_ENTRY: params[6] ?? null,
        TARGET_DOC_NUM: params[7] ?? null,
        TARGET_OBJECT: params[5] ?? null,
      });
      return [] as T[];
    }

    if (statement.startsWith('UPDATE "IC_DOCUMENT_MAPPING"')) {
      const mappingId = Number(params[5]);
      const row = db.tables.IC_DOCUMENT_MAPPING.find((row) => row.MAPPING_ID === mappingId);
      if (row) {
        row.STATUS = params[0];
        if (params[1] !== null && params[1] !== undefined) {
          row.ERROR_MESSAGE = params[1];
        }
        if (params[2] !== null && params[2] !== undefined) {
          row.TARGET_DOC_ENTRY = params[2];
        }
        if (params[3] !== null && params[3] !== undefined) {
          row.TARGET_DOC_NUM = params[3];
        }
        if (params[4] !== null && params[4] !== undefined) {
          row.TARGET_OBJECT = params[4];
        }
      }
      return [] as T[];
    }

    if (statement.includes('FROM "IC_COMPANY"') && statement.includes('WHERE "SAP_DB_NAME" = ?')) {
      const sapDbName = String(params[0]);
      return db.tables.IC_COMPANY.filter((row) => row.SAP_DB_NAME === sapDbName).map(clone) as T[];
    }

    if (statement.includes('FROM "IC_COMPANY"') && statement.includes('WHERE "COMPANY_ID" = ?')) {
      const companyId = Number(params[0]);
      return db.tables.IC_COMPANY.filter((row) => row.COMPANY_ID === companyId).map(clone) as T[];
    }

    if (statement.includes('FROM "IC_COMPANY"') && statement.includes('WHERE "IS_ACTIVE" = 1')) {
      return db.tables.IC_COMPANY.filter((row) => row.IS_ACTIVE === 1).map(clone) as T[];
    }

    if (statement.includes("IC_BP_MAPPING")) {
      // listActiveForCompany (joined + OR company filter)
      if (statement.includes("LEFT JOIN") && statement.includes(" OR ")) {
        const companyId = Number(params[0]);
        const companyById = new Map(
          db.tables.IC_COMPANY.map((row) => [Number(row.COMPANY_ID), row] as const),
        );
        const listed: Row[] = db.tables.IC_BP_MAPPING.filter(
          (row) =>
            row.IS_ACTIVE === 1 &&
            (row.BUYER_COMPANY_ID === companyId || row.VENDOR_COMPANY_ID === companyId),
        )
          .map((row) => {
            const buyer = companyById.get(Number(row.BUYER_COMPANY_ID));
            const vendor = companyById.get(Number(row.VENDOR_COMPANY_ID));
            return {
              ...clone(row),
              BUYER_COMPANY_NAME: buyer?.COMPANY_NAME ?? null,
              VENDOR_COMPANY_NAME: vendor?.COMPANY_NAME ?? null,
            } as Row;
          })
          .sort((left, right) => Number(left.MAPPING_ID) - Number(right.MAPPING_ID));
        return listed as T[];
      }

      const [buyerCompanyId, vendorCode] = params;
      return db.tables.IC_BP_MAPPING.filter(
        (row) =>
          row.BUYER_COMPANY_ID === buyerCompanyId &&
          row.VENDOR_CODE === vendorCode &&
          row.IS_ACTIVE === 1,
      ).map(clone) as T[];
    }

    if (statement.includes('FROM "IC_CONFIGURATION"')) {
      const key = String(params[0]);
      return db.tables.IC_CONFIGURATION.filter((row) => row.CONFIG_KEY === key).map(clone) as T[];
    }

    if (statement.includes('FROM "IC_SAP_CONNECTION"')) {
      const companyId = Number(params[0]);
      return db.tables.IC_SAP_CONNECTION.filter(
        (row) => row.COMPANY_ID === companyId && row.IS_ACTIVE === 1,
      )
        .sort((left, right) => Number(right.IS_DEFAULT) - Number(left.IS_DEFAULT))
        .map(clone) as T[];
    }

    if (statement.includes("COUNT(*)") && statement.includes("IC_NOTIFICATION")) {
      const companyId = Number(params[0]);
      const cnt = db.tables.IC_NOTIFICATION.filter(
        (row) => row.COMPANY_ID === companyId && row.IS_READ === 0,
      ).length;
      return [{ CNT: cnt } as unknown as T];
    }

    if (statement.includes('FROM "IC_NOTIFICATION"') && statement.includes('IS_READ" = 0')) {
      const companyId = Number(params[0]);
      return db.tables.IC_NOTIFICATION.filter(
        (row) => row.COMPANY_ID === companyId && row.IS_READ === 0,
      )
        .sort((left, right) => Number(right.NOTIFICATION_ID) - Number(left.NOTIFICATION_ID))
        .map(clone) as T[];
    }

    // Single row by id (+ optional company scope for P9 isolation)
    if (statement.includes('FROM "IC_NOTIFICATION" WHERE "NOTIFICATION_ID"')) {
      const notificationId = Number(params[0]);
      const companyId =
        statement.includes("COMPANY_ID") && params.length > 1 ? Number(params[1]) : null;
      return db.tables.IC_NOTIFICATION.filter((row) => {
        if (row.NOTIFICATION_ID !== notificationId) {
          return false;
        }
        if (companyId !== null && !Number.isNaN(companyId)) {
          return Number(row.COMPANY_ID) === companyId;
        }
        return true;
      }).map(clone) as T[];
    }

    // Pool-safe reload after insert: TOP 1 by company + document keys
    if (
      statement.includes('FROM "IC_NOTIFICATION"') &&
      statement.includes("DOCUMENT_TYPE") &&
      statement.includes("ORDER BY")
    ) {
      const [companyId, documentType, documentId, flowStep] = params;
      const docId = documentId == null ? "" : String(documentId);
      const step = flowStep == null ? "" : String(flowStep);
      return db.tables.IC_NOTIFICATION.filter((row) => {
        if (row.COMPANY_ID !== companyId) {
          return false;
        }
        if (row.DOCUMENT_TYPE !== documentType) {
          return false;
        }
        const rowDoc = row.DOCUMENT_ID == null ? "" : String(row.DOCUMENT_ID);
        const rowStep = row.FLOW_STEP == null ? "" : String(row.FLOW_STEP);
        return rowDoc === docId && rowStep === step;
      })
        .sort((left, right) => Number(right.NOTIFICATION_ID) - Number(left.NOTIFICATION_ID))
        .slice(0, 1)
        .map(clone) as T[];
    }

    if (statement.includes('FROM "IC_NOTIFICATION"') && statement.includes("COMPANY_ID")) {
      const companyId = Number(params[0]);
      return db.tables.IC_NOTIFICATION.filter((row) => row.COMPANY_ID === companyId)
        .sort((left, right) => Number(right.NOTIFICATION_ID) - Number(left.NOTIFICATION_ID))
        .map(clone) as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_NOTIFICATION"')) {
      const id = nextId(db, "IC_NOTIFICATION");
      db.tables.IC_NOTIFICATION.push({
        COMPANY_ID: params[0],
        DOCUMENT_ID: params[2] ?? null,
        DOCUMENT_TYPE: params[1],
        FLOW_STEP: params[6] ?? null,
        IS_READ: 0,
        MESSAGE: params[4] ?? null,
        NOTIFICATION_ID: id,
        PRIORITY: params[5] ?? "MEDIUM",
        TITLE: params[3],
      });
      return [] as T[];
    }

    if (statement.startsWith('UPDATE "IC_NOTIFICATION"')) {
      // mark single: WHERE "NOTIFICATION_ID" = ? [AND "COMPANY_ID" = ?]
      if (statement.includes('"NOTIFICATION_ID" =')) {
        const notificationId = Number(params[0]);
        const companyId = params.length > 1 ? Number(params[1]) : null;
        const row = db.tables.IC_NOTIFICATION.find((candidate) => {
          if (candidate.NOTIFICATION_ID !== notificationId) {
            return false;
          }
          if (companyId !== null && !Number.isNaN(companyId)) {
            return candidate.COMPANY_ID === companyId;
          }
          return true;
        });
        if (row) {
          row.IS_READ = 1;
        }
        return [] as T[];
      }
      // mark-all-read: WHERE COMPANY_ID = ? AND IS_READ = 0
      if (statement.includes("COMPANY_ID")) {
        const companyId = Number(params[0]);
        for (const row of db.tables.IC_NOTIFICATION) {
          if (row.COMPANY_ID === companyId && row.IS_READ === 0) {
            row.IS_READ = 1;
          }
        }
        return [] as T[];
      }
      return [] as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_RFQ_HEADER"')) {
      const id = nextId(db, "IC_RFQ_HEADER");
      db.tables.IC_RFQ_HEADER.push({
        CREATED_BY: params[7] ?? null,
        PQ_DRAFT_DOC_ENTRY: params[3],
        PQ_DRAFT_DOC_NUM: params[4] ?? null,
        REMARKS: params[6] ?? null,
        RFQ_ID: id,
        RFQ_NUMBER: params[0],
        SOURCE_COMPANY_ID: params[1],
        STATUS: "DRAFT",
        TARGET_COMPANY_ID: params[2],
        VENDOR_CODE: params[5],
      });
      return [] as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_RFQ_LINE"')) {
      const id = nextId(db, "IC_RFQ_LINE");
      db.tables.IC_RFQ_LINE.push({
        DELIVERY_DATE: params[8] ?? null,
        DESCRIPTION: params[3] ?? null,
        DISCOUNT: params[6] ?? 0,
        ITEM_CODE: params[2],
        LINE_NUM: params[1],
        QUANTITY: params[4],
        REMARKS: params[11] ?? null,
        RFQ_ID: params[0],
        RFQ_LINE_ID: id,
        TAX_CODE: params[7] ?? null,
        UNIT_PRICE: params[5] ?? null,
        UOM_CODE: params[10] ?? null,
        WAREHOUSE: params[9] ?? null,
      });
      return [] as T[];
    }

    // Remark-ref resolve: entry OR DocNum OR RFQ_NUMBER (Flow 2 PO comments).
    if (
      statement.includes('FROM "IC_RFQ_HEADER"') &&
      statement.includes("PQ_DRAFT_DOC_NUM") &&
      statement.includes("RFQ_NUMBER")
    ) {
      const sourceCompanyId = params[0];
      const entryRef = params[1];
      const numRef = params.length >= 4 ? params[2] : undefined;
      const rfqNum = params.length >= 4 ? String(params[3]) : String(params[1]);
      return withRfqCompanyNames(
        db,
        db.tables.IC_RFQ_HEADER.filter((row) => {
          if (row.SOURCE_COMPANY_ID !== sourceCompanyId) {
            return false;
          }
          if (entryRef !== undefined && row.PQ_DRAFT_DOC_ENTRY === entryRef) {
            return true;
          }
          if (numRef !== undefined && row.PQ_DRAFT_DOC_NUM === numRef) {
            return true;
          }
          return String(row.RFQ_NUMBER ?? "") === rfqNum;
        }).sort((left, right) => Number(right.RFQ_ID) - Number(left.RFQ_ID)),
      ) as T[];
    }

    if (statement.includes('FROM "IC_RFQ_HEADER"') && statement.includes("PQ_DRAFT_DOC_ENTRY")) {
      const [sourceCompanyId, pqDraftDocEntry] = params;
      return withRfqCompanyNames(
        db,
        db.tables.IC_RFQ_HEADER.filter(
          (row) =>
            row.SOURCE_COMPANY_ID === sourceCompanyId && row.PQ_DRAFT_DOC_ENTRY === pqDraftDocEntry,
        ),
      ) as T[];
    }

    // Seller inbox: filter by target only (JOIN may still mention SOURCE_COMPANY_ID).
    if (
      statement.includes('FROM "IC_RFQ_HEADER"') &&
      statement.includes("TARGET_COMPANY_ID") &&
      statement.includes("ORDER BY") &&
      !statement.includes(" OR ")
    ) {
      const companyId = Number(params[0]);
      return withRfqCompanyNames(
        db,
        db.tables.IC_RFQ_HEADER.filter((row) => row.TARGET_COMPANY_ID === companyId).sort(
          (left, right) => Number(right.RFQ_ID) - Number(left.RFQ_ID),
        ),
      ) as T[];
    }

    if (
      statement.includes('FROM "IC_RFQ_HEADER"') &&
      statement.includes(" OR ") &&
      statement.includes("SOURCE_COMPANY_ID") &&
      statement.includes("TARGET_COMPANY_ID")
    ) {
      const companyId = Number(params[0]);
      return withRfqCompanyNames(
        db,
        db.tables.IC_RFQ_HEADER.filter(
          (row) => row.SOURCE_COMPANY_ID === companyId || row.TARGET_COMPANY_ID === companyId,
        ).sort((left, right) => Number(right.RFQ_ID) - Number(left.RFQ_ID)),
      ) as T[];
    }

    if (
      statement.includes('FROM "IC_RFQ_HEADER"') &&
      (statement.includes('WHERE h."RFQ_ID" = ?') || statement.includes('WHERE "RFQ_ID" = ?'))
    ) {
      const rfqId = Number(params[0]);
      return withRfqCompanyNames(
        db,
        db.tables.IC_RFQ_HEADER.filter((row) => row.RFQ_ID === rfqId),
      ) as T[];
    }

    if (statement.includes('FROM "IC_RFQ_LINE"')) {
      const rfqId = Number(params[0]);
      return db.tables.IC_RFQ_LINE.filter((row) => row.RFQ_ID === rfqId)
        .sort((left, right) => Number(left.LINE_NUM) - Number(right.LINE_NUM))
        .map(clone) as T[];
    }

    if (statement.startsWith('UPDATE "IC_RFQ_HEADER"')) {
      const status = String(params[0]);
      const rfqId = Number(params[1]);
      const row = db.tables.IC_RFQ_HEADER.find((row) => row.RFQ_ID === rfqId);
      if (row) {
        row.STATUS = status;
      }
      return [] as T[];
    }

    if (statement.startsWith('UPDATE "IC_RFQ_LINE"')) {
      // params: unitPrice, deliveryDate, discount, quantity, rfqId, lineNum
      const rfqId = Number(params[4]);
      const lineNum = Number(params[5]);
      const row = db.tables.IC_RFQ_LINE.find(
        (row) => row.RFQ_ID === rfqId && row.LINE_NUM === lineNum,
      );
      if (row) {
        row.UNIT_PRICE = params[0];
        if (params[1] !== null && params[1] !== undefined) {
          row.DELIVERY_DATE = params[1];
        }
        if (params[2] !== null && params[2] !== undefined) {
          row.DISCOUNT = params[2];
        }
        if (params[3] !== null && params[3] !== undefined) {
          row.QUANTITY = params[3];
        }
      }
      return [] as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_SYNC_HISTORY"')) {
      const id = nextId(db, "IC_SYNC_HISTORY");
      db.tables.IC_SYNC_HISTORY.push({
        ACTION: params[1],
        COMPANY_ID: params[0],
        DOCUMENT_ENTRY: params[3] ?? null,
        DOCUMENT_TYPE: params[2] ?? null,
        DURATION_MS: params[5] ?? null,
        RESPONSE_JSON: params[6] ?? null,
        STATUS: params[4],
        SYNC_ID: id,
      });
      return [] as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_RETRY_QUEUE"')) {
      const id = nextId(db, "IC_RETRY_QUEUE");
      db.tables.IC_RETRY_QUEUE.push({
        ACTION_CODE: params[4],
        COMPANY_ID: params[0],
        DOC_MAPPING_ID: params[1] ?? null,
        ERROR_MESSAGE: params[6] ?? null,
        MAX_RETRY: params[7] ?? 2,
        NEXT_RETRY_AT: params[8] ?? null,
        PAYLOAD_JSON: params[5] ?? null,
        RETRY_COUNT: 0,
        RETRY_ID: id,
        SOURCE_DOCUMENT: params[2],
        STATUS: "WAITING",
        TARGET_DOCUMENT: params[3] ?? null,
      });
      return [] as T[];
    }

    if (
      statement.includes('FROM "IC_RETRY_QUEUE"') &&
      statement.includes("WAITING") &&
      statement.includes("NEXT_RETRY_AT")
    ) {
      const now = Date.now();
      return db.tables.IC_RETRY_QUEUE.filter((row) => {
        if (row.STATUS !== "WAITING") {
          return false;
        }
        if (row.NEXT_RETRY_AT === null || row.NEXT_RETRY_AT === undefined) {
          return true;
        }
        const nextAt = Date.parse(String(row.NEXT_RETRY_AT));
        return Number.isFinite(nextAt) ? nextAt <= now : true;
      })
        .sort((left, right) => Number(left.RETRY_ID) - Number(right.RETRY_ID))
        .map(clone) as T[];
    }

    if (statement.includes('FROM "IC_RETRY_QUEUE" WHERE "RETRY_ID"')) {
      const id = Number(params[0]);
      return db.tables.IC_RETRY_QUEUE.filter((row) => row.RETRY_ID === id).map(clone) as T[];
    }

    if (
      statement.includes('FROM "IC_RETRY_QUEUE"') &&
      statement.includes("COMPANY_ID") &&
      !statement.includes("WAITING")
    ) {
      const companyId = Number(params[0]);
      return db.tables.IC_RETRY_QUEUE.filter((row) => row.COMPANY_ID === companyId)
        .sort((left, right) => Number(right.RETRY_ID) - Number(left.RETRY_ID))
        .map(clone) as T[];
    }

    if (statement.startsWith('UPDATE "IC_RETRY_QUEUE"')) {
      if (statement.includes('"RETRY_COUNT"')) {
        const [retryCount, errorMessage, status, deadFlag, retryId] = params;
        const row = db.tables.IC_RETRY_QUEUE.find((item) => item.RETRY_ID === Number(retryId));
        if (row) {
          row.RETRY_COUNT = retryCount;
          row.ERROR_MESSAGE = errorMessage;
          row.STATUS = status;
          row.NEXT_RETRY_AT =
            Number(deadFlag) === 1 ? null : new Date(Date.now() + 300_000).toISOString();
        }
        return [] as T[];
      }

      // forceWaiting: SET STATUS, NEXT_RETRY_AT = NULL WHERE STATUS IN (WAITING, DEAD)
      if (statement.includes("NEXT_RETRY_AT") && statement.includes("IN")) {
        const [status, retryId] = params;
        const row = db.tables.IC_RETRY_QUEUE.find((item) => item.RETRY_ID === Number(retryId));
        if (row && (row.STATUS === "WAITING" || row.STATUS === "DEAD")) {
          row.STATUS = status;
          row.NEXT_RETRY_AT = null;
        }
        return [] as T[];
      }

      if (statement.includes('AND "STATUS"')) {
        const [status, retryId, expectedStatus] = params;
        const row = db.tables.IC_RETRY_QUEUE.find((item) => item.RETRY_ID === Number(retryId));
        if (row && row.STATUS === expectedStatus) {
          row.STATUS = status;
        }
        return [] as T[];
      }

      const [status, retryId] = params;
      const row = db.tables.IC_RETRY_QUEUE.find((item) => item.RETRY_ID === Number(retryId));
      if (row) {
        row.STATUS = status;
      }
      return [] as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_SCHEDULER_JOB"')) {
      const id = nextId(db, "IC_SCHEDULER_JOB");
      db.tables.IC_SCHEDULER_JOB.push({
        COMPANY_ID: params[1] ?? null,
        JOB_ID: id,
        JOB_NAME: params[0],
        LAST_ERROR: null,
        LAST_RUN: null,
        NEXT_RUN: null,
        STATUS: params[2] ?? "IDLE",
      });
      return [] as T[];
    }

    if (statement.includes('FROM "IC_SCHEDULER_JOB"') && statement.includes("JOB_NAME")) {
      const jobName = String(params[0]);
      return db.tables.IC_SCHEDULER_JOB.filter((row) => row.JOB_NAME === jobName).map(clone) as T[];
    }

    if (statement.startsWith('UPDATE "IC_SCHEDULER_JOB"')) {
      const [nextRun, status, lastError, jobName] = params;
      const row = db.tables.IC_SCHEDULER_JOB.find((item) => item.JOB_NAME === jobName);
      if (row) {
        row.LAST_RUN = new Date().toISOString();
        row.NEXT_RUN = nextRun ?? null;
        row.STATUS = status;
        row.LAST_ERROR = lastError ?? null;
      }
      return [] as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_API_LOG"')) {
      const id = nextId(db, "IC_API_LOG");
      db.tables.IC_API_LOG.push({
        COMPANY_ID: params[0] ?? null,
        ENDPOINT: params[2],
        LOG_ID: id,
        METHOD: params[1],
        REQUEST_JSON: params[3] ?? null,
        RESPONSE_JSON: params[4] ?? null,
        STATUS_CODE: params[5] ?? null,
      });
      return [] as T[];
    }

    if (
      statement.includes('FROM "IC_SL_SESSION"') &&
      statement.includes("COMPANY_ID") &&
      statement.includes("EXPIRY_TIME")
    ) {
      const companyId = Number(params[0]);
      const now = Date.now();
      return db.tables.IC_SL_SESSION.filter((row) => {
        if (row.COMPANY_ID !== companyId) {
          return false;
        }
        const expiry = Date.parse(String(row.EXPIRY_TIME ?? ""));
        return Number.isFinite(expiry) ? expiry > now : true;
      })
        .sort((left, right) => Number(right.SESSION_ID) - Number(left.SESSION_ID))
        .map(clone) as T[];
    }

    if (statement.startsWith('INSERT INTO "IC_SL_SESSION"')) {
      const id = nextId(db, "IC_SL_SESSION");
      db.tables.IC_SL_SESSION.push({
        COMPANY_ID: params[0],
        CONNECTION_ID: params[1],
        EXPIRY_TIME: params[5],
        LOGIN_TIME: params[4],
        ROUTE_ID: params[3] ?? null,
        SESSION_ID: id,
        SESSION_TOKEN: params[2],
      });
      return [] as T[];
    }

    if (statement.startsWith('DELETE FROM "IC_SL_SESSION"')) {
      const now = Date.now();
      db.tables.IC_SL_SESSION = db.tables.IC_SL_SESSION.filter((row) => {
        const expiry = Date.parse(String(row.EXPIRY_TIME ?? ""));
        return Number.isFinite(expiry) ? expiry > now : true;
      });
      return [] as T[];
    }

    if (
      statement.startsWith("SELECT") &&
      statement.includes('FROM "IC_SL_SESSION"') &&
      statement.includes("EXPIRY_TIME") &&
      statement.includes("CURRENT_TIMESTAMP") &&
      !statement.includes("COMPANY_ID")
    ) {
      const now = Date.now();
      return db.tables.IC_SL_SESSION.filter((row) => {
        const expiry = Date.parse(String(row.EXPIRY_TIME ?? ""));
        return Number.isFinite(expiry) ? expiry <= now : false;
      }).map(clone) as T[];
    }

    if (statement.startsWith('UPDATE "IC_SL_SESSION"')) {
      const companyId = Number(params[0]);
      for (const row of db.tables.IC_SL_SESSION) {
        if (row.COMPANY_ID === companyId) {
          row.EXPIRY_TIME = new Date(0).toISOString();
        }
      }
      return [] as T[];
    }

    throw new Error(`memory-sql: unsupported statement: ${statement.slice(0, 160)}`);
  },
});

export const seedMemoryCompanyGraph = (db: MemoryDb): void => {
  db.tables.IC_COMPANY.push(
    {
      COMPANY_CODE: "A",
      COMPANY_ID: 1,
      COMPANY_NAME: "Company A",
      DEFAULT_BRANCH_ID: 1,
      IS_ACTIVE: 1,
      SAP_DB_NAME: "DB_A",
    },
    {
      COMPANY_CODE: "B",
      COMPANY_ID: 2,
      COMPANY_NAME: "Company B",
      DEFAULT_BRANCH_ID: 1,
      IS_ACTIVE: 1,
      SAP_DB_NAME: "DB_B",
    },
  );
  db.tables.IC_BP_MAPPING.push({
    BUYER_COMPANY_ID: 1,
    BUYER_CUSTOMER_CODE: "C-A-ON-B",
    IS_ACTIVE: 1,
    MAPPING_ID: 10,
    REMARKS: "A→B",
    VENDOR_CODE: "V-B",
    VENDOR_COMPANY_ID: 2,
  });
  db.tables.IC_SAP_CONNECTION.push({
    COMPANY_ID: 2,
    CONNECTION_ID: 1,
    DATABASE_NAME: "DB_B",
    IS_ACTIVE: 1,
    IS_DEFAULT: 1,
    LICENSE_SERVER: null,
    PASSWORD: "secret",
    SERVER: null,
    SERVICE_LAYER_URL: "https://sl.example/b1s/v1",
    USERNAME: "ic_user",
  });
};
