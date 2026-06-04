import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { InvoiceFilters } from "@/dal/types/ap-invoice.types";
import { APCreditMemoHeaderSchema } from "@/db/schemas/apcreditmemoheader.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import type { APInvoice } from "@/db/schemas/ap-invoice.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { calculateHeaderDiscount } from "@/services/discount.util";
import { normalizeSAPLineData } from "@/services/sap-line-utils";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

import { resolveBaseLineQuantities } from "./base-qty-validation.util";
import { reconcilePOAfterCopyTo } from "./po-reconcile.util";

// Retrieves a paginated list of A/P Invoices from the tenant's HANA database.
// Uses TypeORM QueryBuilder for dynamic SQL generation based on provided filters.
export const getInvoices = async (dbName: string, filters: InvoiceFilters) => {
  try {
    const repo = await getTenantRepository(dbName, APInvoiceSchema);
    const queryBuilder = repo.createQueryBuilder("invoice");
    // Start with a neutral where clause to allow easy appending of dynamic filters.
    queryBuilder.where("1=1");

    // Dynamic Filter: Invoice Number (DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(invoice.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Vendor Code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("invoice.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Vendor Name search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(invoice.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Date Range Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("invoice.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Date Range End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("invoice.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: SAP Document Status (Standard: DocStatus).
    if (filters.DocStatus) {
      queryBuilder.andWhere("invoice.docStatus = :status", {
        status: filters.DocStatus,
      });
    }
    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("invoice.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("invoice.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("invoice.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "invoice.cardCode",
      CardName: "invoice.cardName",
      DocDate: "invoice.docDate",
      DocNum: "invoice.docNum",
      DocStatus: "invoice.docStatus",
      DocTotal: "invoice.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "invoice.docDate": "DESC", "invoice.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Delegate pagination and HANA-specific row-limiting logic to PageService.
    const result = await PageService.getPagedData<APInvoice>({
      dbName,
      entityName: "APInvoices",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    // Map internal DB fields to a consistent API response structure.
    return {
      ...result,
      data: result.data.map((data) => ({
        BalanceDue: Math.round((Number(data.docTotal) - Number(data.paidToDate || 0)) * 100) / 100,
        CardCode: data.cardCode,
        CardName: data.cardName,
        DocCurr: data.docCurr,
        DocDate: data.docDate,
        DocNum: data.docNum,
        DocStatus: data.docStatus,
        DocTotal: data.docTotal,
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
  }
};

export const getInvoiceDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, APInvoiceSchema);
  const queryBuilder = repo.createQueryBuilder("invoice");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("invoice.docNum", "DocNum")
    .addSelect("invoice.cardCode", "CardCode")
    .addSelect("invoice.cardName", "CardName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(invoice.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("invoice.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    DocNum: number | string;
    CardCode?: string;
    CardName?: string;
  }>();
  return rows
    .map((row) => ({
      code: String(row.DocNum).trim(),
      name: row.CardCode
        ? `[${row.CardCode}] ${row.CardName || ""}`.trim()
        : String(row.DocNum).trim(),
    }))
    .filter((item) => item.code.length > 0);
};

// Fetches full document details for a specific A/P Invoice directly from the SAP Service Layer.
// This includes line items which are typically not loaded in the list view.
export const getInvoice = async (sessionId: string, id: string, dbName?: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseInvoices(${id})`,
    )) as SAPDocumentResponse;

    // Calculate remaining open quantity per line by querying consumed quantities from RPC1 (AP Credit Memo lines).
    const consumedByLine = new Map<number, number>();
    if (dbName) {
      const rpc1Repo = await getTenantRepository(dbName, APCreditMemoHeaderSchema);
      const consumedLines = await rpc1Repo
        .createQueryBuilder("rpc1")
        .select("rpc1.baseLine", "baseLine")
        .addSelect("SUM(rpc1.quantity)", "consumedQty")
        .where("rpc1.baseEntry = :baseEntry", { baseEntry: result.DocEntry })
        .andWhere("rpc1.baseType = 18") // 18 = AP Invoice
        .groupBy("rpc1.baseLine")
        .getRawMany<{ baseLine: number; consumedQty: string }>();

      for (const row of consumedLines) {
        consumedByLine.set(Number(row.baseLine), Number(row.consumedQty ?? 0));
      }
    }

    // Enrich lines with calculated OpenQty.
    const enrichedLines = (result.DocumentLines || []).map((line: SAPDocumentLine) => {
      const lineData = line as unknown as Record<string, unknown>;
      const lineNum = Number(lineData.LineNum ?? 0);
      const orderedQty = Number(lineData.Quantity ?? 0);
      const consumedQty = consumedByLine.get(lineNum) ?? 0;
      const openQty = Math.max(0, orderedQty - consumedQty);

      const normalized = normalizeSAPLineData(lineData);
      return {
        ...normalized,
        OpenQty: openQty,
        OpenQuantity: openQty,
      };
    });

    // Normalizing SAP's internal status representation (bost_Open -> 'O') for the frontend.
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
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      DocTotal: result.DocTotal,
      DocumentLines: enrichedLines,
      NumAtCard: result.NumAtCard,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch A/P Invoice from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves an A/P Invoice by its DocNum from the local HANA database to get its Service Layer DocEntry.
export const getInvoiceByDocNum = async (sessionId: string, dbName: string, id: string) => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new AppError("ID is required", 400, "VALIDATION_ERROR");
  }

  // Resolves DocNum to DocEntry from HANA if necessary, ensuring Service Layer compatibility.
  const repo = await getTenantRepository(dbName, APInvoiceSchema);
  const match = await repo
    .createQueryBuilder("invoice")
    .select(["invoice.docEntry"])
    .where("CAST(invoice.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  // If a match is found in HANA, we use the resolved DocEntry.
  // Otherwise, we assume the provided ID is already an internal DocEntry and pass it directly.
  const finalId = match?.docEntry ? String(match.docEntry) : normalizedId;
  return getInvoice(sessionId, finalId, dbName);
};

// Creates a new A/P Invoice in SAP B1. Handles data mapping and date formatting.
export const createInvoice = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
  const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
  const discountData = calculateHeaderDiscount(
    lines.map((l) => ({
      price: ((l.UnitPrice || l.Price) as number) || 0,
      quantity: (l.Quantity as number) || 1,
      discountPercent: (l.DiscountPercent as number) || 0,
    })),
  );

  const sapPayload: Record<string, unknown> = {
    Address: payload.Address,
    Address2: payload.Address2,
    CardCode: payload.CardCode,
    Comments: payload.Comments,
    DocDate: payload.DocDate,
    DocDueDate: payload.DocDueDate || payload.DocDate,
    DiscountPercent: discountData.percent,
    DiscountAmount: discountData.amount,
    DocumentLines: lines.map((item) => {
      const docLine: Record<string, unknown> = {
        ItemCode: item.ItemCode as string,
        Quantity: item.Quantity as number,
        UnitPrice: (item.UnitPrice || item.Price) as number,
        UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
        VatGroup: item.VatGroup as string,
        WarehouseCode: item.WarehouseCode as string,
        DiscountPercent: 0,
      };
      const uomEntry = Number(item.UoMEntry ?? item.UomEntry);
      if (Number.isFinite(uomEntry) && uomEntry > 0) {
        docLine.UoMEntry = Math.trunc(uomEntry);
      } else {
        const uomCode = item.UoMCode ?? item.UomCode;
        if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
          docLine.UoMCode = uomCode as string | number;
        }
      }

      if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
        docLine.BaseType = item.BaseType;
        docLine.BaseEntry = item.BaseEntry;
        docLine.BaseLine = item.BaseLine;
      }

      return docLine;
    }),
    NumAtCard: payload.NumAtCard,
  };

  // Resolve base document quantities for copy-to flows before submitting to SAP.
  // Lines exceeding their base open quantity will have their base linkage stripped
  // so SAP accepts them as unlinked override rows.
  const documentLines = (sapPayload.DocumentLines as Record<string, unknown>[]) ?? [];
  if (dbName && documentLines.length > 0) {
    await resolveBaseLineQuantities(sessionId, documentLines);
  }

  try {
    // Ensure DocDate is in ISO YYYY-MM-DD format as required by SAP Service Layer.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }
    const docDueDate = sapPayload.DocDueDate as string;
    if (docDueDate && docDueDate.length === 8) {
      sapPayload.DocDueDate = `${docDueDate.slice(0, 4)}-${docDueDate.slice(
        4,
        6,
      )}-${docDueDate.slice(6, 8)}`;
    }

    // Create the purchase invoice document in SAP.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/PurchaseInvoices",
      sapPayload,
    )) as SAPDocumentResponse;

    // Cache Invalidation: Clear dashboard stats for this tenant since a new invoice affects outstanding totals.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    // Reconcile originating PO(s) after A/P Invoice save.
    // Walks back to the PO from base linkage (direct or via GRPO) and closes it if fully consumed.
    if (dbName) {
      await reconcilePOAfterCopyTo(sessionId, dbName, documentLines);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "A/P Invoice created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    const errorMessage = caughtError.message || "";

    // SAP B1 enforces uniqueness on NumAtCard (Customer/Vendor Reference).
    // For copy-to flows (PO/GRPO -> AP Invoice), the same source reference may be reused.
    // Detect duplicate reference errors and retry with a unique suffix.
    const isDuplicateRefError =
      errorMessage.includes("duplicate") &&
      (errorMessage.toLowerCase().includes("reference") ||
        errorMessage.toLowerCase().includes("numatcard"));

    if (isDuplicateRefError && sapPayload.NumAtCard) {
      try {
        // Append a timestamp-based suffix to make the reference unique
        const originalRef = sapPayload.NumAtCard as string;
        const uniqueSuffix = Date.now().toString().slice(-6);
        sapPayload.NumAtCard = `${originalRef} (${uniqueSuffix})`;

        logger.info({
          msg: "Retrying AP Invoice create with unique reference due to duplicate NumAtCard",
          newRef: sapPayload.NumAtCard,
          originalRef,
        });

        const result = (await serviceLayerClient.request(
          sessionId,
          "POST",
          "/PurchaseInvoices",
          sapPayload,
        )) as SAPDocumentResponse;

        const session = serviceLayerClient.getSession(sessionId);
        if (session?.companyDB) {
          purgeCache(`dash:purchase:${session.companyDB}:`);
        }

        // Reconcile originating PO(s) after A/P Invoice save (retry path).
        if (dbName) {
          await reconcilePOAfterCopyTo(sessionId, dbName, documentLines);
        }

        return {
          DocEntry: result.DocEntry,
          DocNum: result.DocNum,
          message: "A/P Invoice created successfully",
          success: true,
        };
      } catch (err: unknown) {
        const retryError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          error: retryError.message,
          msg: "Failed to create A/P Invoice even after retry with unique reference",
        });
        throw retryError;
      }
    }

    logger.error({
      error: caughtError.message,
      msg: "Failed to create A/P Invoice in Service Layer",
    });
    throw caughtError;
  }
};

// Updates an existing A/P Invoice. Currently, only the 'Comments' field is allowed for modification.
export const updateInvoice = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Comments !== undefined) {
      sapPayload.Comments = payload.Comments;
    }
    if (payload.NumAtCard !== undefined) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }
    if (payload.DocDueDate) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }

    // PATCH request to SAP: Partial updates are standard for meta fields like comments.
    await serviceLayerClient.request(sessionId, "PATCH", `/PurchaseInvoices(${id})`, sapPayload);

    // Invalidate dashboard metrics to reflect any potential status changes (though comments usually don't).
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { message: "A/P Invoice updated successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update A/P Invoice",
    });
    throw caughtError;
  }
};

// Cancels an A/P Invoice in SAP. This is a irreversible operational action in SAP B1.
export const cancelInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseInvoices(${id})/Cancel`);

    // Invalidate dashboard metrics to reflect the removal of this invoice from transactional totals.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { message: "A/P Invoice cancelled successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel A/P Invoice",
    });
    throw caughtError;
  }
};

// Reopens a closed A/P Invoice in the SAP system.
export const reopenInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseInvoices(${id})/Reopen`);
    return {
      message: "A/P Invoice reopened successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to reopen A/P Invoice",
    });
    throw caughtError;
  }
};

export const apInvoiceService = {
  cancelInvoice,
  createInvoice,
  getInvoice,
  getInvoiceByDocNum,
  getInvoiceDocNums,
  getInvoices,
  reopenInvoice,
  updateInvoice,
};
