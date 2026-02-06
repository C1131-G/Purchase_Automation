// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PurchaseOrderFilters } from "@/dal/types/purchase-order.types";
// Data Access & Schemas
import { type PurchaseOrder, PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type {
  SAPAttachmentResult,
  SAPDocumentLine,
  SAPDocumentResponse,
} from "@/services/types/sap.types";

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

    // Dynamic Filter: Cancellation status.
    if (filters.Canceled) {
      queryBuilder.andWhere("po.canceled = :canceled", {
        canceled: filters.Canceled,
      });
    }

    // Executes the query with centralized pagination and sorting.
    const result = await PageService.getPagedData<PurchaseOrder>({
      query: queryBuilder,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 10,
      sort: { "po.docDate": "DESC", "po.docNum": "DESC" },
      entityName: "PurchaseOrders",
      dbName,
    });

    // Maps internal TypeORM entities to a standardized API response format.
    return {
      ...result,
      data: result.data.map((data) => ({
        id: data.docEntry,
        DocEntry: data.docEntry,
        DocNum: data.docNum,
        DocDate: data.docDate,
        CardCode: data.cardCode,
        CardName: data.cardName,
        DocTotal: data.docTotal,
        DocStatus: data.docStatus,
        Canceled: data.canceled,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw error;
  }
};

// Requests a specific PO document from the Service Layer, including item lines.
export const getPurchaseOrder = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders(${id})`,
    )) as SAPDocumentResponse;

    // Normalizes SAP status (bost_Open) to a single character (O/C) for the internal logic.
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
      DocStatus: result.DocumentStatus === "bost_Open" ? "O" : "C",
      Canceled: result.Cancelled === "tYES" ? "Y" : "N",
      Comments: result.Comments,
      DocumentLines: (result.DocumentLines || []).map((line: SAPDocumentLine) => ({
        ItemCode: line.ItemCode,
        ItemDescription: line.ItemDescription,
        Quantity: line.Quantity,
        Price: line.Price || line.UnitPrice,
        UoMCode: (line as unknown as Record<string, unknown>).UoMCode,
        WarehouseCode: line.WarehouseCode,
        TaxCode: line.TaxCode,
        LineTotal: line.LineTotal,
      })),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to fetch purchase order from Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

// Submits a new Purchase Order to SAP B1.
export const createPurchaseOrder = async (
  sessionId: string,
  payload: Record<string, unknown>,
  files: Record<string, unknown> = {},
) => {
  try {
    const sapPayload: Record<string, unknown> = {
      CardCode: payload.CardCode,
      DocDate: payload.DocDate,
      DocDueDate: payload.DocDueDate || payload.DocDate,
      Comments: payload.Comments,
      Address: payload.Address,
      DocumentLines: (payload.DocumentLines as Record<string, unknown>[])?.map((item) => ({
        ItemCode: item.ItemCode as string,
        Quantity: item.Quantity as number,
        UnitPrice: (item.UnitPrice || item.Price) as number,
        TaxCode: item.TaxCode as string,
        WarehouseCode: item.WarehouseCode as string,
        DiscountPercent: item.DiscountPercent as number,
      })),
    };

    // Formats DocDate into SAP-compliant YYYY-MM-DD.
    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.substring(0, 4)}-${docDate.substring(
        4,
        6,
      )}-${docDate.substring(6, 8)}`;
    }
    const docDueDate = sapPayload.DocDueDate as string;
    if (docDueDate && docDueDate.length === 8) {
      sapPayload.DocDueDate = `${docDueDate.substring(0, 4)}-${docDueDate.substring(
        4,
        6,
      )}-${docDueDate.substring(6, 8)}`;
    }

    // Process and link attachments to the PO header.
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

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/PurchaseOrders",
      sapPayload,
    )) as SAPDocumentResponse;

    logger.info({
      msg: "Purchase order created in SAP",
      docEntry: result.DocEntry,
      docNum: result.DocNum,
    });

    // Invalidate the procurement dashboard metrics for this tenant.
    const dbName = result.CompanyDB || result.DBName;
    if (dbName) {
      purgeCache(`dash:purchase:${dbName}:`);
    }

    return {
      success: true,
      message: "Purchase Order created successfully",
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to create purchase order in Service Layer",
      error: error.message,
    });
    throw error;
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

    if (payload.Comments) sapPayload.Comments = payload.Comments;
    if (payload.Address) sapPayload.Address = payload.Address;
    if (payload.DocDueDate) sapPayload.DocDueDate = payload.DocDueDate;

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      sapPayload.DocumentLines = lines.map((item) => ({
        ItemCode: item.ItemCode as string,
        Quantity: item.Quantity as number,
        UnitPrice: (item.UnitPrice || item.Price) as number,
        TaxCode: item.TaxCode as string,
        WarehouseCode: item.WarehouseCode as string,
      }));
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/PurchaseOrders(${id})`, sapPayload);

    // Dashboard metrics must be refreshed to reflect potential total spend changes.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      success: true,
      message: "Purchase Order updated successfully",
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to update purchase order in Service Layer",
      error: error.message,
      id,
    });
    throw error;
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
      success: true,
      message: "Purchase Order cancelled successfully",
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({
      msg: "Failed to cancel purchase order in Service Layer",
      error: error.message,
      id,
    });
    throw error;
  }
};

export const purchaseOrderService = {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
};
