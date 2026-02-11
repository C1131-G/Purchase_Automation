// GRPO Service: Handles Goods Receipt Purchase Order logic. Manages the lifecycle of goods receipt, including linking to base Purchase Orders.

// Core & Utils
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { GRPOFilters } from "@/dal/types/grpo.types";
// Data Access & Schemas
import { type GRPO, GRPOSchema } from "@/db/schemas/grpo.schema";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type {
  SAPAttachmentResult,
  SAPDocumentLine,
  SAPDocumentResponse,
} from "@/services/types/sap.types";

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
        queryBuilder.andWhere("grpo.docTotal = :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("grpo.docTotal < :docTotal", { docTotal: filters.DocTotal });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("grpo.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "grpo.docNum",
      DocDate: "grpo.docDate",
      CardCode: "grpo.cardCode",
      CardName: "grpo.cardName",
      DocTotal: "grpo.docTotal",
      DocStatus: "grpo.docStatus",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "grpo.docDate": "DESC", "grpo.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes the query with centralized pagination and sorting logic.
    const result = await PageService.getPagedData<GRPO>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort,
      entityName: "GRPOs",
      dbName,
    });

    // Maps database rows to the standard internal GRPO model.
    return {
      ...result,
      data: result.data.map((data) => ({
        id: data.docEntry,
        DocNum: data.docNum,
        DocDate: data.docDate,
        CardCode: data.cardCode,
        CardName: data.cardName,
        DocTotal: data.docTotal,
        DocCurr: data.docCurr,
        DocStatus: data.docStatus === "O" ? "Open" : "Closed",
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw error;
  }
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
      msg: "Available POs fetched for vendor",
      vendorCode,
      count: result.value?.length || 0,
    });

    // Map SAP fields to internal frontend-friendly property names.
    const mappedPOs = (result.value || []).map((po: SAPDocumentResponse) => ({
      id: po.DocEntry,
      purchaseOrderNo: po.DocNum.toString(),
      poDate: po.DocDate,
      vendorCode: po.CardCode,
      vendorName: po.CardName,
      vendorRefNumber: "",
      total: po.DocTotal,
    }));

    return mappedPOs;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch available POs",
      error: error.message,
      vendorCode,
    });
    return [];
  }
};

// Fetches deep document details for a specific PO, including itemized lines.
// This data is used to pre-populate the GRPO creation form.
export const getPODetail = async (sessionId: string, poDocEntry: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders(${poDocEntry})`,
    )) as SAPDocumentResponse;

    return {
      id: result.DocEntry,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Address: result.Address,
      DocTotal: result.DocTotal,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => ({
        ItemCode: line.ItemCode,
        ItemDescription: line.ItemDescription,
        Quantity: line.Quantity,
        UoMCode: (line as unknown as Record<string, unknown>).UoMCode, // SAP internal UoM ID.
        Price: line.Price || line.UnitPrice,
        WarehouseCode: line.WarehouseCode,
        TaxCode: line.TaxCode || "",
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch PO details for GRPO",
      error: error.message,
      poDocEntry,
    });
    throw error;
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

    return {
      id: result.DocEntry,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocDate: result.DocDate,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Address: result.Address,
      Comments: result.Comments,
      DocTotal: result.DocTotal,
      DocCurr: result.DocCurrency,
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => ({
        ItemCode: line.ItemCode,
        ItemDescription: line.ItemDescription,
        Quantity: line.Quantity,
        Price: line.Price || line.UnitPrice,
        UoMCode: (line as unknown as Record<string, unknown>).UoMCode,
        WarehouseCode: line.WarehouseCode,
        LineTotal: line.LineTotal,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch GRPO from Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Creates a GRPO document in SAP. Crucially, it links each line back to its source Purchase Order.
export const createGRPO = async (
  sessionId: string,
  payload: Record<string, unknown>,
  files: Record<string, unknown> = {},
) => {
  try {
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      DocDate: payload.DocDate,
      Comments: payload.Comments,
      DocumentLines: (payload.DocumentLines as Record<string, unknown>[])?.map((item) => ({
        ItemCode: item.ItemCode as string,
        Quantity: item.Quantity as number,
        UnitPrice: (item.UnitPrice || item.Price) as number,
        WarehouseCode: item.WarehouseCode as string,
        // SAP Required: BaseType 22 indicates this line references a Purchase Order.
        BaseType: 22,
        BaseEntry: item.BaseEntry as number, // The DocEntry of the source PO.
        BaseLine: item.BaseLine as number, // The specific line number in the source PO.
      })),
    };

    // Standardizes date format for SAP.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
    }

    // Process and attach uploaded files.
    const uploadedFilesRaw = files?.UploadedFiles;
    if (uploadedFilesRaw) {
      const uploadedFiles = Array.isArray(uploadedFilesRaw) ? uploadedFilesRaw : [uploadedFilesRaw];
      logger.info({ msg: "Processing attachments", count: uploadedFiles.length });

      if (uploadedFiles.length > 0) {
        try {
          const attachmentResult = (await serviceLayerClient.uploadAttachment(
            sessionId,
            uploadedFiles[0],
          )) as unknown as SAPAttachmentResult;
          if (attachmentResult?.AbsoluteEntry) {
            sapPayload.AttachmentEntry = attachmentResult.AbsoluteEntry;
            logger.info({ msg: "Attachment linked", attachmentEntry: sapPayload.AttachmentEntry });
          }
        } catch (attachErr: unknown) {
          const attachError = attachErr instanceof Error ? attachErr : new Error(String(attachErr));
          logger.error({
            msg: "Attachment upload failed, proceeding without attachment",
            error: attachError.message,
          });
        }
      }
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
    }

    return {
      success: true,
      message: "GRPO created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to create GRPO in Service Layer",
      error: error.message,
    });
    throw error;
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
    if (payload.Comments) sapPayload.Comments = payload.Comments;

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
      success: true,
      message: "GRPO updated successfully",
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to update GRPO in Service Layer",
      error: error.message,
      id,
    });
    throw error;
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
      success: true,
      message: "GRPO cancelled successfully",
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to cancel GRPO in Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

export const grpoService = {
  getGRPOs,
  getAvailablePOs,
  getPODetail,
  getGRPO,
  createGRPO,
  updateGRPO,
  cancelGRPO,
};
