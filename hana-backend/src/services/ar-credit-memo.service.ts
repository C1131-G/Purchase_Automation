// A/R Credit Memo Service: Logic for A/R Credit Memos (Sales Returns/Credits), combining HANA queries for listings and SAP Service Layer for document lifecycle.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { executeTenantQuery, getTenantRepository } from "@/dal/tenant-dal.helper";
import type { CreditNoteFilters } from "@/dal/types/ar-credit-memo.types";
import { ARCreditMemoSchema } from "@/db/schemas/ar-credit-memo.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "./attachments.service";

// Fetches a paginated list of A/R Credit Memos from HANA with dynamic filtering support.
// Uses a UNION ALL pattern to combine final documents (ORIN) with drafts (ODRF, ObjType='14').
export const getCreditNotes = async (dbName: string, filters: CreditNoteFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '14'`);
      }

      if (filters.DocNum) {
        whereClauses.push(`CAST("DocNum" AS NVARCHAR) LIKE ?`);
        params.push(`%${filters.DocNum}%`);
      }

      if (filters.CardCode) {
        whereClauses.push(`"CardCode" LIKE ?`);
        params.push(`%${filters.CardCode}%`);
      }

      if (filters.CardName) {
        whereClauses.push(`LOWER("CardName") LIKE LOWER(?)`);
        params.push(`%${filters.CardName}%`);
      }

      if (filters.DocDateStart) {
        whereClauses.push(`"DocDate" >= ?`);
        params.push(filters.DocDateStart);
      }

      if (filters.DocDateEnd) {
        whereClauses.push(`"DocDate" <= ?`);
        params.push(filters.DocDateEnd);
      }

      if (filters.DocStatus) {
        const statusVal = filters.DocStatus;
        if (isDraft) {
          if (statusVal !== "D" && statusVal !== "Draft") {
            whereClauses.push("1=0");
          }
        } else {
          if (statusVal === "D" || statusVal === "Draft") {
            whereClauses.push("1=0");
          } else {
            whereClauses.push(`"DocStatus" = ?`);
            params.push(statusVal);
          }
        }
      }

      if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
        const opMap = { eq: "=", lt: "<", gt: ">" };
        const op = opMap[filters.DocTotalOperator as keyof typeof opMap];
        if (op) {
          whereClauses.push(`"DocTotal" ${op} ?`);
          params.push(filters.DocTotal);
        }
      }

      const selectColumns = isDraft
        ? `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", 'D' AS "DocStatus", "Address", "Address2", 0 AS "PaidToDate"`
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "Address", "Address2", COALESCE("PaidToDate", 0) AS "PaidToDate"`;

      const sql = `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
      return { sql, params };
    };

    const subCN = buildSubQuery("ORIN", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subCN.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subCN.params, ...subDraft.params];

    const countSql = `SELECT COUNT(*) AS "total" FROM (${combinedSql}) AS "Counted"`;

    const sortFieldMap: Record<string, string> = {
      CardCode: `"CardCode"`,
      CardName: `"CardName"`,
      DocDate: `"DocDate"`,
      DocNum: `"DocNum"`,
      DocStatus: `"DocStatus"`,
      DocTotal: `"DocTotal"`,
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const orderBy = requestedSortField
      ? `ORDER BY ${requestedSortField} ${requestedSortOrder}`
      : `ORDER BY "DocDate" DESC, "DocNum" DESC`;

    const limit = Number(filters.limit) || 10;
    const page = Number(filters.page) || 1;
    const offset = (page - 1) * limit;

    const dataSql = `
      ${combinedSql}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...combinedParams, limit, offset];

    const [countRows, dataRows] = await Promise.all([
      executeTenantQuery(dbName, countSql, combinedParams) as Promise<any[]>,
      executeTenantQuery(dbName, dataSql, dataParams) as Promise<any[]>,
    ]);

    const total = Number(countRows[0]?.total ?? (countRows[0] as any)?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataRows.map((row: any) => ({
        BalanceDue: Math.round((Number(row.DocTotal) - Number(row.PaidToDate ?? 0)) * 100) / 100,
        CardCode: row.CardCode,
        CardName: row.CardName,
        DocCurr: row.DocCurr,
        DocDate: row.DocDate,
        DocNum: row.DocNum,
        DocStatus:
          row.DocStatus === "O"
            ? "Open"
            : row.DocStatus === "C"
              ? "Closed"
              : row.DocStatus === "D"
                ? "Draft"
                : row.DocStatus,
        DocTotal: row.DocTotal,
        Address: row.Address,
        Address2: row.Address2,
        id: row.DocEntry,
      })),
      limit,
      page,
      total,
      totalPages,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      error: caughtError.message,
      msg: "Failed to fetch A/R Credit Memos",
    });
    throw caughtError;
  }
};

export const getCreditNoteDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ARCreditMemoSchema);
  const queryBuilder = repo.createQueryBuilder("cn");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("cn.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(cn.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("cn.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Retrieves detailed data for a single A/R Credit Memo from the SAP Service Layer.
export const getCreditNote = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/CreditNotes(${id})`;
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      endpoint,
    )) as SAPDocumentResponse;

    const attachmentEntry = (result as any).AttachmentEntry || null;
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let attachments: import("./attachments.service").FileMetadata[] = [];
    if (attachmentEntry) {
      attachments = await attachmentsService.getSAPAttachment(sessionId, attachmentEntry, dbName);
    }
    if (attachments.length === 0 && dbName) {
      attachments = await attachmentsService.getLocalAttachments(
        dbName,
        "ARCreditMemo",
        result.DocEntry,
      );
    }

    // Normalize SAP internal status (bost_Open) to a single character code.
    return {
      Address: result.Address,
      Address2: result.Address2,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Comments: result.Comments,
      DocCurr: result.DocCurrency,
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      DocNum: result.DocNum,
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      DocTotal: result.DocTotal,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        const normalized = normalizeSAPLineData(lineData);
        return {
          ...normalized,
          U_ReturnReason: lineData.U_ReturnReason || "",
        };
      }),
      NumAtCard: result.NumAtCard,
      SalesPersonCode: result.SalesPersonCode,
      AttachmentEntry: attachmentEntry,
      attachments,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch A/R Credit Memo detail from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a DocNum to DocEntry from HANA and fetches full details from Service Layer.
export const getCreditNoteByDocNum = async (
  sessionId: string,
  dbName: string,
  id: string,
  draftDocEntry?: string,
) => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new AppError("ID is required", 400, "VALIDATION_ERROR");
  }

  if (draftDocEntry) {
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '14' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getCreditNote(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  const repo = await getTenantRepository(dbName, ARCreditMemoSchema);
  const match = await repo
    .createQueryBuilder("cn")
    .select(["cn.docEntry"])
    .where("CAST(cn.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  const finalId = match?.docEntry ? String(match.docEntry) : normalizedId;
  return getCreditNote(sessionId, finalId);
};

// Creates a new Sales Credit Note (A/R Credit Memo) in SAP B1.
export const createCreditNote = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    // Map input payload to the canonical SAP Service Layer JSON structure for Credit Notes.

    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const attachments = payload.attachments as any[];

    const isDraft = payload.isDraft === true;
    const draftDocEntry = Number(payload.draftDocEntry || 0);

    // Defensive fallback: when converting a draft to a real document, re-read the draft from SAP
    // before deleting it so we can carry forward Comments/NumAtCard if the payload doesn't include them.
    let draftComments: string | undefined;
    let draftNumAtCard: string | undefined;
    if (!isDraft && draftDocEntry > 0) {
      try {
        const draftData = (await serviceLayerClient.request(
          sessionId,
          "GET",
          `/Drafts(${draftDocEntry})?$select=Comments,NumAtCard`,
        )) as { Comments?: string; NumAtCard?: string };
        draftComments = draftData?.Comments;
        draftNumAtCard = draftData?.NumAtCard;
      } catch {
        // Non-fatal: if we can't read the draft, proceed with the provided payload values.
      }
    }

    const session = serviceLayerClient.getSession(sessionId);
    const resolvedDbName = session?.companyDB || "";

    let absoluteEntry: number | null = null;
    if (attachments && attachments.length > 0 && resolvedDbName) {
      absoluteEntry = await attachmentsService.createSAPAttachment(
        sessionId,
        resolvedDbName,
        attachments,
      );
    }

    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      Address2: payload.Address2,
      CardCode: payload.CardCode,
      Comments: payload.Comments ?? draftComments,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: lines.map((item) => {
        const line: Record<string, unknown> = {
          LineNum: item.LineNum !== undefined ? Number(item.LineNum) : undefined,
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          DiscountPercent: Number(item.DiscountPercent ?? 0), // SAP requires 0 to avoid double-discounting when Header Discount is used
          VatGroup: (item.VatGroup ?? item.TaxCode) as string,
          WarehouseCode: item.WarehouseCode as string,
        };

        // Prefer UoMEntry over UoMCode for more reliable linking in SAP
        const uomEntry = Number(item.UoMEntry ?? item.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          line.UoMEntry = Math.trunc(uomEntry);
          line.UseBaseUnit = "tNO";
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            line.UoMCode = uomCode as string | number;
            line.UseBaseUnit = "tNO";
          }
        }

        // Only map Base document fields if they represent a valid SAP linking type (e.g. 13 for AR Invoice)
        if (item.BaseType !== undefined && item.BaseType !== null && Number(item.BaseType) !== -1) {
          line.BaseType = Number(item.BaseType);
          line.BaseEntry = Number(item.BaseEntry);
          line.BaseLine = Number(item.BaseLine);
        }
        // Map ReturnReason to the SAP UDF on each line
        if (item.U_ReturnReason) {
          line.U_ReturnReason = item.U_ReturnReason as string;
        }
        return line;
      }),
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      SalesPersonCode: payload.SalesPersonCode,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "14";
    }

    // Correct date formatting to YYYY-MM-DD.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }

    // Submit POST request to SAP for credit note creation.
    logger.info({
      cardCode: sapPayload.CardCode,
      docNum: payload.DocNum,
      lineCount: (sapPayload.DocumentLines as Record<string, unknown>[])?.length,
      lines: (sapPayload.DocumentLines as Record<string, unknown>[]).map((l, i) => ({
        index: i,
        ItemCode: l.ItemCode,
        Quantity: l.Quantity,
        BaseType: l.BaseType,
        BaseEntry: l.BaseEntry,
        BaseLine: l.BaseLine,
        UoMEntry: l.UoMEntry,
        VatGroup: l.VatGroup,
      })),
      msg: isDraft ? "Sending AR Credit Memo Draft to SAP" : "Sending AR Credit Memo to SAP",
    });

    const endpoint = isDraft ? "/Drafts" : "/CreditNotes";
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      endpoint,
      sapPayload,
    )) as SAPDocumentResponse;

    if (!isDraft && draftDocEntry) {
      logger.info({ draftDocEntry, msg: "Deleting source draft after A/R Credit Memo conversion" });
      await serviceLayerClient
        .request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`)
        .catch((err) => {
          logger.error({
            draftDocEntry,
            error: err.message,
            msg: "Failed to delete draft after conversion",
          });
        });
    }

    // Purge sales-related dashboard cache to ensure totals (including returns) are recalculated.
    if (resolvedDbName) {
      purgeCache(`dash:sales:${resolvedDbName}:`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "ARCreditMemo",
          result.DocEntry,
          result.DocNum,
          absoluteEntry,
          attachments,
        );
      }
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: isDraft
        ? "A/R Credit Memo Draft saved successfully"
        : "A/R Credit Memo created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create A/R Credit Memo in Service Layer",
    });
    throw caughtError;
  }
};

export const updateCreditNote = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  const isDraft = payload.isDraft === true || Boolean(payload.draftDocEntry);
  const docEntry = isDraft ? Number(payload.draftDocEntry || id) : id;

  try {
    const sapPayload: Record<string, unknown> = {};

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        // Fetch DocNum and existing AttachmentEntry directly from HANA database via TypeORM
        let docNum: string | number = id;
        let existingAttachmentEntry: number | null = null;
        if (!isDraft) {
          try {
            const memoRepo = await getTenantRepository(dbName, ARCreditMemoSchema);
            const memoDoc = await memoRepo.findOne({
              where: { docEntry: Number(id) },
              select: ["docNum", "atcEntry"],
            });
            if (memoDoc) {
              docNum = memoDoc.docNum;
              existingAttachmentEntry = memoDoc.atcEntry ?? null;
            }
          } catch (dbErr: any) {
            logger.warn(
              { id, err: dbErr.message },
              "Failed to query database for doc info, falling back to Service Layer GET",
            );
            // Fallback to Service Layer GET if database query fails
            try {
              const docData = await serviceLayerClient.request<any>(
                sessionId,
                "GET",
                `/CreditNotes(${id})?$select=DocNum,AttachmentEntry`,
              );
              if (docData?.DocNum) {
                docNum = docData.DocNum;
              }
              if (docData?.AttachmentEntry) {
                existingAttachmentEntry = docData.AttachmentEntry;
              }
            } catch (err: any) {
              logger.warn({ id, err: err.message }, "Failed to fetch doc info from Service Layer");
            }
          }
        } else {
          try {
            const docData = await serviceLayerClient.request<any>(
              sessionId,
              "GET",
              `/Drafts(${docEntry})?$select=DocNum,AttachmentEntry`,
            );
            if (docData?.DocNum) {
              docNum = docData.DocNum;
            }
            if (docData?.AttachmentEntry) {
              existingAttachmentEntry = docData.AttachmentEntry;
            }
          } catch (err: any) {
            logger.warn(
              { id: docEntry, err: err.message },
              "Failed to fetch doc info from Service Layer",
            );
          }
        }

        const { attachmentEntry, shouldUpdateDoc } =
          await attachmentsService.syncAttachmentsOnUpdate(
            sessionId,
            dbName,
            isDraft ? "ARCreditMemoDraft" : "ARCreditMemo",
            String(docEntry),
            docNum,
            payload.attachments as any[],
            existingAttachmentEntry,
          );

        if (shouldUpdateDoc) {
          sapPayload.AttachmentEntry = attachmentEntry;
        }
      }
    }

    if (payload.Comments !== undefined) {
      sapPayload.Comments = payload.Comments;
    }
    if (payload.Address !== undefined) {
      sapPayload.Address = payload.Address;
    }
    if (payload.Address2 !== undefined) {
      sapPayload.Address2 = payload.Address2;
    }
    if (payload.DocDate !== undefined) {
      sapPayload.DocDate = payload.DocDate;
    }
    const endpoint = isDraft ? `/Drafts(${docEntry})` : `/CreditNotes(${id})`;
    if (payload.DocDueDate !== undefined) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }
    if (payload.NumAtCard !== undefined) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    // Support updating document lines for draft credit memos
    if (Array.isArray(payload.DocumentLines)) {
      const lines = payload.DocumentLines as Record<string, unknown>[];

      sapPayload.DocumentLines = lines.map((item) => {
        const line: Record<string, unknown> = {
          LineNum: item.LineNum !== undefined ? Number(item.LineNum) : undefined,
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          DiscountPercent: Number(item.DiscountPercent ?? 0),
          VatGroup: (item.VatGroup ?? item.TaxCode) as string,
          WarehouseCode: item.WarehouseCode as string,
        };

        const uomEntry = Number(item.UoMEntry ?? item.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          line.UoMEntry = Math.trunc(uomEntry);
          line.UseBaseUnit = "tNO";
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            line.UoMCode = uomCode as string | number;
            line.UseBaseUnit = "tNO";
          }
        }
        if (item.U_ReturnReason) {
          line.U_ReturnReason = item.U_ReturnReason as string;
        }
        return line;
      });
    }

    // Partial update via PATCH.
    await serviceLayerClient.request(sessionId, "PATCH", endpoint, sapPayload);

    // Invalidate tenant-specific sales dashboard cache.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: isDraft
        ? "A/R Credit Memo Draft saved successfully"
        : "A/R Credit Memo updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update A/R Credit Memo",
    });
    throw caughtError;
  }
};

// Executes the cancellation procedure for an A/R Credit Memo in SAP B1.
export const cancelCreditNote = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/CreditNotes(${id})/Cancel`);

    // Dashboard caches Must be purged to reflect the loss of revenue/receivables.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return { message: "A/R Credit Memo cancelled successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel A/R Credit Memo",
    });
    throw caughtError;
  }
};

export const arCreditMemoService = {
  cancelCreditNote,
  createCreditNote,
  getCreditNote,
  getCreditNoteByDocNum,
  getCreditNoteDocNums,
  getCreditNotes,
  updateCreditNote,
};
