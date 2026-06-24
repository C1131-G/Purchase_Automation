import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { GRPOFilters } from "@/dal/types/grpo.types";
// Data Access & Schemas
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { APInvoiceHeaderSchema } from "@/db/schemas/apinvoiceheader.schema";
import type { GRPO } from "@/db/schemas/grpo.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { normalizeSAPLineData } from "@/services/sap-line-utils";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
import { adjustPayloadDates } from "./date-adjustment.util";

import { resolveBaseLineQuantities } from "./base-qty-validation.util";
import { reconcilePOAfterCopyTo } from "./po-reconcile.util";
import { attachmentsService } from "./attachments.service";

// Fetches a paginated list of GRPOs from the HANA database with dynamic search filters.
export const getGRPOs = async (dbName: string, filters: GRPOFilters) => {
  try {
    const repo = await getTenantRepository(dbName, GRPOSchema);
    const queryBuilder = repo.createQueryBuilder("grpo");
    queryBuilder.where("1=1");

    // Dynamic Filter: GRPO Number (DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(grpo.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Vendor Code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("grpo.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Vendor Name case-insensitive search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(grpo.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Date Range Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("grpo.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Date Range End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("grpo.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    // Dynamic Filter: SAP Document Status (Standard: DocStatus).
    if (filters.DocStatus) {
      queryBuilder.andWhere("grpo.docStatus = :status", {
        status: filters.DocStatus,
      });
    }

    // Dynamic Filter: Total amount comparison.
    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("grpo.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("grpo.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("grpo.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "grpo.cardCode",
      CardName: "grpo.cardName",
      DocDate: "grpo.docDate",
      DocNum: "grpo.docNum",
      DocStatus: "grpo.docStatus",
      DocTotal: "grpo.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "grpo.docDate": "DESC", "grpo.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with centralized pagination and sorting logic.
    const result = await PageService.getPagedData<GRPO>({
      dbName,
      entityName: "GRPOs",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    // Maps database rows to the standard internal GRPO model.
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

export const getGRPODocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, GRPOSchema);
  const queryBuilder = repo.createQueryBuilder("grpo");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder
    .select("grpo.docNum", "DocNum")
    .addSelect("grpo.cardCode", "CardCode")
    .addSelect("grpo.cardName", "CardName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(grpo.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("grpo.docNum", "DESC");
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

// Requests a list of open Purchase Orders for a specific vendor from the Service Layer.
// This is typically called at the start of the GRPO creation wizard.
export const getAvailablePOs = async (sessionId: string, vendorCode: string) => {
  try {
    if (!vendorCode) {
      return [];
    }

    // Filters for "bost_Open" so only valid, unfulfilled POs are returned for receipting.
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders?$filter=CardCode eq '${vendorCode}' and DocumentStatus eq 'bost_Open'&$select=DocEntry,DocNum,DocDate,CardCode,CardName,DocTotal`,
    )) as { value: SAPDocumentResponse[] };

    logger.info({
      count: result.value?.length || 0,
      msg: "Available POs fetched for vendor",
      vendorCode,
    });

    // Map SAP fields to internal frontend-friendly property names.
    const mappedPOs = (result.value || []).map((po: SAPDocumentResponse) => ({
      id: po.DocEntry,
      poDate: po.DocDate,
      purchaseOrderNo: po.DocNum.toString(),
      total: po.DocTotal,
      vendorCode: po.CardCode,
      vendorName: po.CardName,
      vendorRefNumber: "",
    }));

    return mappedPOs;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to fetch available POs",
      vendorCode,
    });
    return [];
  }
};

// Fetches deep document details for a specific PO, including itemized lines.
// This data is used to pre-populate the GRPO creation form.
export const getPODetail = async (sessionId: string, dbName: string, id: string) => {
  try {
    const normalizedId = id.trim();
    let poDocEntry = normalizedId;

    // Resolves DocNum to DocEntry from HANA if necessary, ensuring Service Layer compatibility.
    const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
    const match = await repo
      .createQueryBuilder("po")
      .select(["po.docEntry"])
      .where("CAST(po.docNum AS NVARCHAR) = :id", { id: normalizedId })
      .getOne();

    if (match?.docEntry) {
      poDocEntry = String(match.docEntry);
    }

    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders(${poDocEntry})`,
    )) as SAPDocumentResponse;

    const mappedLines = (result.DocumentLines || []).map((line: SAPDocumentLine) => {
      const lineData = line as unknown as Record<string, unknown>;
      const sapTaxRate = Number(lineData.TaxPercentagePerRow ?? lineData.VatPrcnt ?? 0);
      const vatGroup = line.VatGroup || String(lineData.TaxCode ?? "").trim();

      return {
        ItemCode: line.ItemCode,
        ItemDescription: line.ItemDescription,
        Price: line.Price || line.UnitPrice,
        Quantity: line.Quantity,
        TaxCode: String(lineData.TaxCode ?? "").trim(),
        UoMCode: lineData.UoMCode,
        UoMEntry: lineData.UoMEntry,
        VatGroup: vatGroup,
        VatPrcnt: sapTaxRate,
        WarehouseCode: line.WarehouseCode,
      };
    });

    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      CardCode: result.CardCode,
      CardName: result.CardName,
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocTotal: result.DocTotal,
      DocumentLines: mappedLines,
      NumAtCard: result.NumAtCard,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch PO details for GRPO",
    });
    throw caughtError;
  }
};

// Obtains the full GRPO document structure from the Service Layer.
export const getGRPO = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseDeliveryNotes(${id})`,
    )) as SAPDocumentResponse;

    const enrichedLines = (result.DocumentLines || []).map((line: SAPDocumentLine) => {
      const lineData = line as unknown as Record<string, unknown>;
      const normalized = normalizeSAPLineData(lineData);
      const sapTaxRate = Number(lineData.TaxPercentagePerRow ?? lineData.VatPrcnt ?? 0);
      const vatGroup = normalized.VatGroup || String(lineData.TaxCode ?? "").trim();

      return {
        ...normalized,
        OpenQty: Number(
          lineData.OpenQuantity ??
            lineData.RemainingOpenQuantity ??
            lineData.RemainingQuantity ??
            lineData.BaseOpenQuantity ??
            line.Quantity ??
            0,
        ),
        VatGroup: vatGroup,
        VatPrcnt: sapTaxRate,
      };
    });

    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    const attachments = dbName
      ? await attachmentsService.getLocalAttachments(dbName, "GRPO", result.DocEntry)
      : [];

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
      attachments,
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
      msg: "Failed to fetch GRPO from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a GRPO by its DocNum from the local HANA database to get its Service Layer DocEntry.
export const getGRPOByDocNum = async (sessionId: string, dbName: string, id: string) => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new AppError("ID is required", 400, "VALIDATION_ERROR");
  }

  // Resolves DocNum to DocEntry from HANA if necessary, ensuring Service Layer compatibility.
  const repo = await getTenantRepository(dbName, GRPOSchema);
  const match = await repo
    .createQueryBuilder("grpo")
    .select(["grpo.docEntry"])
    .where("CAST(grpo.docNum AS NVARCHAR) = :id", { id: normalizedId })
    .getOne();

  // If a match is found in HANA, we use the resolved DocEntry.
  // Otherwise, we assume the provided ID is already an internal DocEntry and pass it directly.
  const grpoDocEntry = match?.docEntry ? String(match.docEntry) : normalizedId;
  const grpoDetail = await getGRPO(sessionId, grpoDocEntry);

  // Calculate remaining open quantity per line by querying consumed quantities from PCH1 (AP Invoice lines).
  const pch1Repo = await getTenantRepository(dbName, APInvoiceHeaderSchema);
  const consumedLines = await pch1Repo
    .createQueryBuilder("pch1")
    .select("pch1.baseLine", "baseLine")
    .addSelect("SUM(pch1.quantity)", "consumedQty")
    .where("pch1.baseEntry = :baseEntry", { baseEntry: grpoDetail.DocEntry })
    .andWhere("pch1.baseType = 20")
    .groupBy("pch1.baseLine")
    .getRawMany<{ baseLine: number; consumedQty: string }>();

  const consumedByLine = new Map<number, number>();
  for (const row of consumedLines) {
    consumedByLine.set(Number(row.baseLine), Number(row.consumedQty ?? 0));
  }

  // Enrich lines with calculated OpenQty.
  const enrichedLines = (grpoDetail.DocumentLines || []).map((line: Record<string, unknown>) => {
    const lineNum = Number(line.LineNum ?? 0);
    const orderedQty = Number(line.Quantity ?? 0);
    const consumedQty = Number(consumedByLine.get(lineNum) ?? 0);
    const openQty = Math.max(0, orderedQty - consumedQty);

    return {
      ...line,
      OpenQty: openQty,
    };
  });

  return {
    ...grpoDetail,
    DocumentLines: enrichedLines,
  };
};

// Creates a GRPO document in SAP. Crucially, it links each line back to its source Purchase Order.
export const createGRPO = async (
  sessionId: string,
  payload: Record<string, unknown>,
  dbName?: string,
) => {
  const lines = (payload.DocumentLines as Record<string, unknown>[]) || [];
  const attachments = payload.attachments as any[];

  try {
    const documentLines = lines;
    if (dbName && documentLines.length > 0) {
      await resolveBaseLineQuantities(sessionId, documentLines);
    }

    const sapPayload: Record<string, unknown> = {
      Address: payload.Address,
      Address2: payload.Address2,
      CardCode: payload.CardCode,
      Comments: payload.Comments,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
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

        // SAP Required: BaseType 22 indicates this line references a Purchase Order.
        // We only include these fields if we have a valid BaseEntry and BaseLine.
        if (Number.isFinite(item.BaseEntry) && Number.isFinite(item.BaseLine)) {
          line.BaseType = item.BaseType ?? 22;
          line.BaseEntry = item.BaseEntry;
          line.BaseLine = item.BaseLine;
        }

        return line;
      }),
      NumAtCard: payload.NumAtCard,
    };

    // Standardizes date format for SAP.
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

    // Submit the creation request to the PurchaseDeliveryNotes endpoint.
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/PurchaseDeliveryNotes",
      sapPayload,
    )) as SAPDocumentResponse;

    // Purge purchase dashboard cache as the PO statues and totals have likely changed.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
      if (attachments && attachments.length > 0) {
        const finalized = await attachmentsService.finalizeAttachments(
          session.companyDB,
          "GRPO",
          result.DocNum,
          attachments,
        );
        await attachmentsService.saveLocalAttachments(
          session.companyDB,
          "GRPO",
          result.DocEntry,
          finalized,
        );
      }
    }

    // Reconcile originating PO(s) after GRPO save.
    // Walks back to the PO from base linkage and closes it if fully consumed.
    if (dbName) {
      await reconcilePOAfterCopyTo(sessionId, dbName, documentLines);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "GRPO created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create GRPO in Service Layer",
    });
    throw caughtError;
  }
};

// Updates secondary fields (like Comments) on an existing GRPO.
export const updateGRPO = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};

    if (Object.hasOwn(payload, "Comments")) {
      sapPayload.Comments = payload.Comments;
    }
    if (Object.hasOwn(payload, "DocDueDate")) {
      sapPayload.DocDueDate = payload.DocDueDate;
      await adjustPayloadDates(sessionId, sapPayload, true, `/PurchaseDeliveryNotes(${id})`);
    }
    if (Object.hasOwn(payload, "NumAtCard")) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }
    if (Object.hasOwn(payload, "Address")) {
      sapPayload.Address = payload.Address;
    }
    if (Object.hasOwn(payload, "Address2")) {
      sapPayload.Address2 = payload.Address2;
    }

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        let docNum: string | number = id;
        try {
          const docData = await serviceLayerClient.request<any>(
            sessionId,
            "GET",
            `/PurchaseDeliveryNotes(${id})?$select=DocNum`,
          );
          if (docData?.DocNum) {
            docNum = docData.DocNum;
          }
        } catch (err: any) {
          logger.warn({ id, err: err.message }, "Failed to fetch DocNum for renaming attachments");
        }

        const attachments = payload.attachments as any[];
        const finalized = await attachmentsService.finalizeAttachments(
          dbName,
          "GRPO",
          docNum,
          attachments || [],
        );
        await attachmentsService.saveLocalAttachments(dbName, "GRPO", id, finalized);
      }
    }

    await serviceLayerClient.request(
      sessionId,
      "PATCH",
      `/PurchaseDeliveryNotes(${id})`,
      sapPayload,
    );

    // Invalidate dashboard metrics for the tenant.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "GRPO updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update GRPO in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the cancellation flow for a GRPO document in SAP B1.
export const cancelGRPO = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseDeliveryNotes(${id})/Cancel`);

    // Cache must be cleared to reflect the reversal of item receipt.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "GRPO cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel GRPO in Service Layer",
    });
    throw caughtError;
  }
};

export const grpoService = {
  cancelGRPO,
  createGRPO,
  getAvailablePOs,
  getGRPO,
  getGRPOByDocNum,
  getGRPODocNums,
  getGRPOs,
  getPODetail,
  updateGRPO,
};
