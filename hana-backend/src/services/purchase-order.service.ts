// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PurchaseOrderFilters } from "@/dal/types/purchase-order.types";
// Data Access & Schemas
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { GRPOHeaderSchema } from "@/db/schemas/grpoheader.schema";
import type { PurchaseOrder } from "@/db/schemas/purchase-order.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { normalizeSAPLineData } from "@/services/sap-line-utils";

import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/services/attachments.service";
import { adjustPayloadDates } from "./date-adjustment.util";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

// Retrieves a paginated list of Purchase Orders from the HANA database.
export const getPurchaseOrders = async (dbName: string, filters: PurchaseOrderFilters) => {
  try {
    const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
    const queryBuilder = repo.createQueryBuilder("po");

    queryBuilder.where("1=1");

    // Dynamic Filter: PO Document Number search.
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(po.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Vendor Code search (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("po.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Vendor Name search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(po.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Execution Date Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("po.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Execution Date End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("po.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: Status (Standard: DocStatus).
    if (filters.DocStatus) {
      queryBuilder.andWhere("po.docStatus = :status", {
        status: filters.DocStatus,
      });
    }

    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("po.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("po.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("po.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "po.cardCode",
      CardName: "po.cardName",
      DocDate: "po.docDate",
      DocNum: "po.docNum",
      DocStatus: "po.docStatus",
      DocTotal: "po.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "po.docDate": "DESC", "po.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with centralized pagination and sorting.
    const result = await PageService.getPagedData<PurchaseOrder>({
      dbName,
      entityName: "PurchaseOrders",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    // Maps internal TypeORM entities to a standardized API response format.
    return {
      ...result,
      data: result.data.map((data) => ({
        CardCode: data.cardCode,
        CardName: data.cardName,
        DocCurr: data.docCurr,
        DocDate: data.docDate,
        DocNum: data.docNum,
        DocStatus: data.docStatus === "O" ? "Open" : "Closed",
        DocTotal: data.docTotal,
        Address: data.address,
        Address2: data.address2,
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
  }
};

// Returns distinct DocNum values for lookup/search popup.
export const getPurchaseOrderDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
  const queryBuilder = repo.createQueryBuilder("po");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("po.docNum", "DocNum")
    .addSelect("po.cardCode", "CardCode")
    .addSelect("po.cardName", "CardName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(po.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }

  queryBuilder.orderBy("po.docNum", "DESC");
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

// Requests a specific PO document from the Service Layer, including item lines.
export const getPurchaseOrder = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders(${id})`,
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
        "PurchaseOrder",
        result.DocEntry,
      );
    }

    // Normalizes SAP status (bost_Open) to a single character (O/C) for the internal logic.
    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Comments: result.Comments,
      DocCurr: result.DocCurrency,
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      DocTotal: result.DocTotal,
      AttachmentEntry: attachmentEntry,
      attachments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => {
        const lineData = line as unknown as Record<string, unknown>;
        const normalized = normalizeSAPLineData(lineData);

        // Use TaxPercentagePerRow (the actual rate SAP applied) as the authoritative tax rate.
        // This is what SAP actually uses (e.g. 15 for "FJIN-15"), not our input TaxCode.
        const sapTaxRate = Number(
          lineData.TaxPercentagePerRow ?? lineData.TaxPrcnt ?? lineData.VatPrcnt ?? 0,
        );

        return {
          ...normalized,
          VatPrcnt: sapTaxRate,
          OpenQty: Number(
            lineData.OpenQuantity ??
              lineData.RemainingOpenQuantity ??
              lineData.RemainingQuantity ??
              lineData.BaseOpenQuantity ??
              line.Quantity ??
              0,
          ),
        };
      }),
      NumAtCard: result.NumAtCard,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch purchase order from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a PO by DocNum from tenant DB and fetches full details from Service Layer.
export const getPurchaseOrderByDocNum = async (sessionId: string, dbName: string, id: string) => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new AppError("ID is required", 400, "VALIDATION_ERROR");
  }

  // Resolves DocNum to DocEntry from HANA if necessary, ensuring Service Layer compatibility.
  const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
  const match = await repo
    .createQueryBuilder("po")
    .select(["po.docEntry"])
    .where("CAST(po.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  // If a match is found in HANA, we use the resolved DocEntry.
  // Otherwise, we assume the provided ID is already an internal DocEntry and pass it directly.
  const poDocEntry = match?.docEntry ? String(match.docEntry) : normalizedId;
  const poDetail = await getPurchaseOrder(sessionId, poDocEntry);
  // Tax rates are already populated in getPurchaseOrder() from TaxPercentagePerRow.

  // Calculate remaining open quantity per line by querying delivered quantities from PDN1 (GRPO lines).
  const pdn1Repo = await getTenantRepository(dbName, GRPOHeaderSchema);
  const deliveredLines = await pdn1Repo
    .createQueryBuilder("pdn1")
    .select("pdn1.baseLine", "baseLine")
    .addSelect("SUM(pdn1.quantity)", "deliveredQty")
    .where("pdn1.baseEntry = :baseEntry", { baseEntry: poDetail.DocEntry })
    .andWhere("pdn1.baseType = 22")
    .groupBy("pdn1.baseLine")
    .getRawMany<{ baseLine: number; deliveredQty: string }>();

  const deliveredByLine = new Map<number, number>();
  for (const row of deliveredLines) {
    deliveredByLine.set(Number(row.baseLine), Number(row.deliveredQty ?? 0));
  }

  // Enrich lines with calculated OpenQty.
  // Prefer the SAP-provided OpenQty (from Service Layer) as the authoritative source,
  // but use the PDN1-calculated value if it shows less remaining (i.e., more delivered).
  // This handles cases where PDN1 sync is faster or SAP's OpenQuantity hasn't been updated yet.
  const enrichedLines = (poDetail.DocumentLines || []).map((line: Record<string, unknown>) => {
    const lineNum = Number(line.LineNum ?? 0);
    const orderedQty = Number(line.Quantity ?? 0);
    const deliveredQty = deliveredByLine.get(lineNum) ?? 0;
    const pdn1OpenQty = Math.max(0, orderedQty - deliveredQty);

    // The line already has OpenQty from getPurchaseOrder() (SAP Service Layer fields).
    // Use the minimum of SAP's OpenQty and PDN1-calculated OpenQty as the safer value.
    const existingOpenQty = Number(line.OpenQty ?? orderedQty);
    const openQty = Math.min(existingOpenQty, pdn1OpenQty);

    return {
      ...line,
      OpenQty: openQty,
    };
  });

  return {
    ...poDetail,
    DocumentLines: enrichedLines,
  };
};

// Submits a new Purchase Order to SAP B1.
export const createPurchaseOrder = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    // Validate UoM before sending to SAP
    const inputLines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const linesMissingUom = inputLines
      .map((line) => ({
        itemCode: String(line.ItemCode ?? "").trim(),
        uomCode: String(line.UoMCode ?? line.UomCode ?? "").trim(),
        uomEntry: Number(line.UoMEntry ?? line.UomEntry),
      }))
      .filter((line) => !line.uomCode && !Number.isFinite(line.uomEntry));

    if (linesMissingUom.length > 0) {
      const missingItems = linesMissingUom.map((line) => line.itemCode || "<unknown>");
      logger.warn({
        missingItems,
        msg: "Purchase order payload has lines without UoMCode/UoMEntry",
      });
      throw new AppError(
        `Missing UoM for item(s): ${missingItems.join(", ")}`,
        400,
        "VALIDATION_ERROR",
      );
    }

    const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
    const attachments = payload.attachments as any[];

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
      Comments: payload.Comments,
      NumAtCard: payload.NumAtCard,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: lines.map((item) => {
        const docLine: Record<string, unknown> = {
          LineNum: item.LineNum !== undefined ? Number(item.LineNum) : undefined,
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          DiscountPercent: Number(item.DiscountPercent ?? 0),
          UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
          VatGroup: item.VatGroup as string,
          WarehouseCode: item.WarehouseCode as string,
        };
        const uomEntry = Number(item.UoMEntry ?? item.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          docLine.UoMEntry = Math.trunc(uomEntry);
          docLine.UseBaseUnit = "tNO";
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
            docLine.UseBaseUnit = "tNO";
          }
        }

        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          docLine.BaseType = item.BaseType;
          docLine.BaseEntry = item.BaseEntry;
          docLine.BaseLine = item.BaseLine;
        }

        return docLine;
      }),
      SalesPersonCode: payload.SalesPersonCode,
      Rounding: payload.Rounding,
      RoundingDiffAmount: payload.RoundingDiffAmount,
    };

    // Formats DocDate into SAP-compliant YYYY-MM-DD.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }
    await adjustPayloadDates(sessionId, sapPayload);
    const docDueDate = sapPayload.DocDueDate as string;
    if (docDueDate && docDueDate.length === 8) {
      sapPayload.DocDueDate = `${docDueDate.slice(0, 4)}-${docDueDate.slice(
        4,
        6,
      )}-${docDueDate.slice(6, 8)}`;
    }

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/PurchaseOrders",
      sapPayload,
    )) as SAPDocumentResponse;

    // Invalidate the procurement dashboard metrics for this tenant.
    const resolvedDbNameFromRes = result.CompanyDB || result.DBName || session?.companyDB || "";
    if (resolvedDbNameFromRes) {
      purgeCache(`dash:purchase:${resolvedDbNameFromRes}:`);
      if (result?.DocEntry && absoluteEntry !== null) {
        await attachmentsService.finalizeAndLinkAttachments(
          resolvedDbNameFromRes,
          "PurchaseOrder",
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
      message: "Purchase Order created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create purchase order in Service Layer",
    });
    throw caughtError;
  }
};

// PATCH request to update mutable fields (Comments, DueDate) on an existing PO.
export const updatePurchaseOrder = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        // Fetch DocNum and existing AttachmentEntry directly from HANA database via TypeORM
        let docNum: string | number = id;
        let existingAttachmentEntry: number | null = null;
        try {
          const poRepo = await getTenantRepository(dbName, PurchaseOrderSchema);
          const poDoc = await poRepo.findOne({
            where: { docEntry: Number(id) },
            select: ["docNum", "atcEntry"],
          });
          if (poDoc) {
            docNum = poDoc.docNum;
            existingAttachmentEntry = poDoc.atcEntry ?? null;
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
              `/PurchaseOrders(${id})?$select=DocNum,AttachmentEntry`,
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

        const { attachmentEntry, shouldUpdateDoc } =
          await attachmentsService.syncAttachmentsOnUpdate(
            sessionId,
            dbName,
            "PurchaseOrder",
            id,
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
    if (payload.DocDate !== undefined) {
      sapPayload.DocDate = payload.DocDate;
    }
    if (payload.DocDueDate !== undefined) {
      sapPayload.DocDueDate = payload.DocDueDate;
      await adjustPayloadDates(sessionId, sapPayload, true, `/PurchaseOrders(${id})`);
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      sapPayload.DocumentLines = lines.map((item) => {
        const docLine: Record<string, unknown> = {
          LineNum: item.LineNum !== undefined ? Number(item.LineNum) : undefined,
          ItemCode: item.ItemCode as string,
          Quantity: item.Quantity as number,
          UnitPrice: (item.UnitPrice || item.Price) as number,
          DiscountPercent: Number(item.DiscountPercent ?? 0),
          UoMEntry: (item.UoMEntry ?? item.UomEntry) as number | undefined,
          VatGroup: item.VatGroup as string,
          WarehouseCode: item.WarehouseCode as string,
        };
        const uomEntry = Number(item.UoMEntry ?? item.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          docLine.UoMEntry = Math.trunc(uomEntry);
          docLine.UseBaseUnit = "tNO";
        } else {
          const uomCode = item.UoMCode ?? item.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
            docLine.UseBaseUnit = "tNO";
          }
        }

        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          docLine.BaseType = item.BaseType;
          docLine.BaseEntry = item.BaseEntry;
          docLine.BaseLine = item.BaseLine;
        }

        return docLine;
      });
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/PurchaseOrders(${id})`, sapPayload);

    // Dashboard metrics must be refreshed to reflect potential total spend changes.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "Purchase Order updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update purchase order in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the cancellation workflow for a PO in SAP.
export const cancelPurchaseOrder = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseOrders(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "Purchase Order cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel purchase order in Service Layer",
    });
    throw caughtError;
  }
};

export const purchaseOrderService = {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrderByDocNum,
  getPurchaseOrderDocNums,
  getPurchaseOrders,
  updatePurchaseOrder,
};
