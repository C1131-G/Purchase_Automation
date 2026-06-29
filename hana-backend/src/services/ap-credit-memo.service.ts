// A/P Credit Memo Service: Logic for A/P Credit Memos, combining HANA database queries for lists and SAP Service Layer for detailed document operations.

import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { executeTenantQuery, getTenantRepository } from "@/dal/tenant-dal.helper";
import type { CreditNoteFilters } from "@/dal/types/ap-credit-memo.types";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { attachmentsService } from "./attachments.service";

// Fetches a paginated list of A/P Credit Memos from HANA.
// Uses TypeORM's query builder to construct dynamic filters based on user search criteria.
export const getCreditNotes = async (dbName: string, filters: CreditNoteFilters) => {
  try {
    const buildSubQuery = (table: string, isDraft: boolean) => {
      const whereClauses = ["1=1"];
      const params: unknown[] = [];

      if (isDraft) {
        whereClauses.push(`"ObjType" = '19'`);
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
        : `"DocEntry", "DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocCur" AS "DocCurr", "DocStatus", "Address", "Address2", "PaidToDate"`;

      const sql = `SELECT ${selectColumns} FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
      return { sql, params };
    };

    const subCreditNote = buildSubQuery("ORPC", false);
    const subDraft = buildSubQuery("ODRF", true);

    const combinedSql = `
      SELECT * FROM (
        ${subCreditNote.sql}
        UNION ALL
        ${subDraft.sql}
      ) AS "Combined"
    `;
    const combinedParams = [...subCreditNote.params, ...subDraft.params];

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
      data: dataRows.map((row: any) => {
        const docTotal = Number(row.DocTotal || 0);
        const paidToDate = Number(row.PaidToDate || 0);
        return {
          BalanceDue: Math.round((docTotal - paidToDate) * 100) / 100,
          CardCode: row.CardCode,
          CardName: row.CardName,
          DocCurr: row.DocCurr,
          DocDate: row.DocDate,
          DocNum: row.DocNum,
          DocStatus: row.DocStatus === "O" ? "Open" : row.DocStatus === "C" ? "Closed" : "Draft",
          DocTotal: docTotal,
          Address: row.Address,
          Address2: row.Address2,
          id: row.DocEntry,
        };
      }),
      limit,
      page,
      total,
      totalPages,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
  }
};

export const getCreditNoteDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, APCreditMemoSchema);
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

// Internal: Fetches A/P Credit Memo detail directly from SAP using DocEntry.
const getCreditNoteByDocEntry = async (sessionId: string, docEntry: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${docEntry})` : `/PurchaseCreditNotes(${docEntry})`;
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      endpoint,
    )) as SAPDocumentResponse;

    const attachmentEntry = (result as any).AttachmentEntry || null;
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let attachments = [];
    if (attachmentEntry) {
      attachments = await attachmentsService.getSAPAttachment(sessionId, attachmentEntry, dbName);
    }
    if (attachments.length === 0 && dbName) {
      attachments = await attachmentsService.getLocalAttachments(
        dbName,
        "APCreditMemo",
        result.DocEntry,
      );
    }

    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
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
      AttachmentEntry: attachmentEntry,
      attachments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        return {
          ...normalizeSAPLineData(lineData),
          U_ReturnReason: lineData.U_ReturnReason,
        };
      }),
      NumAtCard: (result as unknown as Record<string, unknown>).NumAtCard,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      docEntry,
      error: caughtError.message,
      msg: "Failed to fetch A/P Credit Memo from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves an A/P Credit Memo by DocNum from HANA to get its DocEntry, then fetches full details from SAP.
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
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '19' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getCreditNoteByDocEntry(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  // 1. Check APCreditMemo (real document)
  const repo = await getTenantRepository(dbName, APCreditMemoSchema);
  const match = await repo
    .createQueryBuilder("cn")
    .select(["cn.docEntry"])
    .where("CAST(cn.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  if (match?.docEntry) {
    return getCreditNoteByDocEntry(sessionId, String(match.docEntry));
  }

  // 2. Check ODRF (draft document)
  const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '19' AND CAST("DocNum" AS NVARCHAR) = ?`;
  const draftMatch = (await executeTenantQuery(dbName, draftQuery, [normalizedId])) as any[];

  if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
    return getCreditNoteByDocEntry(sessionId, String(draftMatch[0].DocEntry), true);
  }

  throw new AppError("A/P Credit Memo not found", 404, "NOT_FOUND");
};

// Obtains full document detail for an A/P Credit Memo from the SAP Service Layer.
// Note: Prefer using getCreditNoteByDocNum for DocNum-based lookups.
export const getCreditNote = async (sessionId: string, id: string) =>
  getCreditNoteByDocEntry(sessionId, id);

// Creates a formal A/P Credit Memo in SAP. Handles payload conversion.
export const createCreditNote = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
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

  try {
    const session = serviceLayerClient.getSession(sessionId);
    const resolvedDbName = session?.companyDB || dbName || "";

    let absoluteEntry: number | null = null;
    if (attachments && attachments.length > 0 && resolvedDbName) {
      absoluteEntry = await attachmentsService.createSAPAttachment(
        sessionId,
        resolvedDbName,
        attachments,
      );
    }

    // Construct the SAP Service Layer compatible payload.
    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      Address2: payload.Address2,
      CardCode: payload.CardCode,
      Comments: payload.Comments ?? draftComments,
      NumAtCard: payload.NumAtCard ?? draftNumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: lines.map((item) => {
        const line: Record<string, unknown> = {
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
          VatGroup: item.VatGroup as string,
          WarehouseCode: item.WarehouseCode as string,
          DiscountPercent: Number(item.DiscountPercent ?? 0),
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
        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          line.BaseType = item.BaseType as number;
          line.BaseEntry = item.BaseEntry as number;
          line.BaseLine = item.BaseLine as number;
        }
        return line;
      }),
      SalesPersonCode: payload.SalesPersonCode,
    };

    if (isDraft) {
      sapPayload.DocObjectCode = "19";
    }

    // Date normalization to ensure SAP acceptance (YYYY-MM-DD).
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }
    const docDueDate = sapPayload.DocDueDate as string;
    if (docDueDate && docDueDate.length === 8) {
      sapPayload.DocDueDate = `${docDueDate.slice(0, 4)}-${docDueDate.slice(4, 6)}-${docDueDate.slice(6, 8)}`;
    }
    // Submit the credit note to SAP.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      isDraft ? "/Drafts" : "/PurchaseCreditNotes",
      sapPayload,
    )) as SAPDocumentResponse;

    // After converting a draft to a real document, delete the draft.
    if (!isDraft && draftDocEntry) {
      try {
        await serviceLayerClient.request(sessionId, "DELETE", `/Drafts(${draftDocEntry})`);
        logger.info({
          draftDocEntry,
          msg: "Deleted draft after successful A/P Credit Memo creation",
        });
      } catch (draftErr: unknown) {
        const draftDelErr = draftErr instanceof Error ? draftErr : new Error(String(draftErr));
        logger.warn({
          draftDocEntry,
          error: draftDelErr.message,
          msg: "Failed to delete draft after A/P Credit Memo creation (non-fatal)",
        });
      }
    }

    // Purge cached dashboard metrics as this new document impacts credit/balance totals.
    if (resolvedDbName) {
      if (!isDraft) {
        purgeCache(`dash:purchase:${resolvedDbName}:`);
      }
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbName,
          "APCreditMemo",
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
        ? "A/P Credit Memo Draft saved successfully"
        : "A/P Credit Memo created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create A/P Credit Memo in Service Layer",
    });
    throw caughtError;
  }
};

// Updates meta-fields (like Comments, NumAtCard, DocDueDate) on an existing A/P Credit Memo.
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
            const memoRepo = await getTenantRepository(dbName, APCreditMemoSchema);
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
                `/PurchaseCreditNotes(${id})?$select=DocNum,AttachmentEntry`,
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
            isDraft ? "APCreditMemoDraft" : "APCreditMemo",
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
    if (payload.NumAtCard !== undefined) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }
    if (payload.Address !== undefined) {
      sapPayload.Address = payload.Address;
    }
    if (payload.Address2 !== undefined) {
      sapPayload.Address2 = payload.Address2;
    }
    if (payload.DocDueDate) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }
    if (payload.DocDate) {
      sapPayload.DocDate = payload.DocDate;
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }
    if (isDraft && payload.DocumentLines !== undefined) {
      const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
      sapPayload.DocumentLines = lines.map((item) => {
        const line: Record<string, unknown> = {
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
          VatGroup: item.VatGroup as string,
          WarehouseCode: item.WarehouseCode as string,
          DiscountPercent: Number(item.DiscountPercent ?? 0),
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
        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          line.BaseType = item.BaseType as number;
          line.BaseEntry = item.BaseEntry as number;
          line.BaseLine = item.BaseLine as number;
        }
        return line;
      });
    }

    const endpoint = isDraft ? `/Drafts(${docEntry})` : `/PurchaseCreditNotes(${id})`;
    await serviceLayerClient.request(sessionId, "PATCH", endpoint, sapPayload, true, {
      "B1S-ReplaceCollectionsOnPatch": "true",
    });

    // Clear relevant caches for the tenant.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      if (!isDraft) {
        purgeCache(`dash:purchase:${session.companyDB}:`);
      }
    }

    return {
      message: isDraft
        ? "A/P Credit Memo Draft updated successfully"
        : "A/P Credit Memo updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update A/P Credit Memo",
    });
    throw caughtError;
  }
};

// Triggers the cancellation procedure for an A/P Credit Memo in SAP B1.
export const cancelCreditNote = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseCreditNotes(${id})/Cancel`);

    // Dashboard cache must be cleared to reflect the removal of this balance.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { message: "A/P Credit Memo cancelled successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel A/P Credit Memo",
    });
    throw caughtError;
  }
};

export const apCreditMemoService = {
  cancelCreditNote,
  createCreditNote,
  getCreditNote,
  getCreditNoteByDocNum,
  getCreditNoteDocNums,
  getCreditNotes,
  updateCreditNote,
};
