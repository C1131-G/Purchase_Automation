import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/db/tenant-query";
// Data Access & Schemas
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { normalizeSAPLineData } from "@/services/sap-line-normalize";
import { resolveCurrencyCode } from "@/services/currency-format";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";

import { attachmentsService } from "@/modules/attachments/attachments.service";
import { pickSapLotCollections } from "@/services/sap-line-lots";

// Fetches a paginated list of GRPOs from the HANA database with dynamic search filters.

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
    const mappedPOs = (result.value || []).map((purchaseOrder: SAPDocumentResponse) => ({
      id: purchaseOrder.DocEntry,
      poDate: purchaseOrder.DocDate,
      purchaseOrderNo: purchaseOrder.DocNum.toString(),
      total: purchaseOrder.DocTotal,
      vendorCode: purchaseOrder.CardCode,
      vendorName: purchaseOrder.CardName,
      vendorRefNumber: "",
    }));

    return mappedPOs;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
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
      err: caughtError,
      id,
      msg: "Failed to fetch PO details for GRPO",
    });
    throw caughtError;
  }
};

// Obtains the full GRPO document structure from the Service Layer.

export const getGRPO = async (sessionId: string, id: string, isDraft = false) => {
  try {
    const endpoint = isDraft ? `/Drafts(${id})` : `/PurchaseDeliveryNotes(${id})`;
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      endpoint,
    )) as SAPDocumentResponse;

    const enrichedLines = (result.DocumentLines || []).map((line: SAPDocumentLine) => {
      const lineData = line as unknown as Record<string, unknown>;
      const normalized = normalizeSAPLineData(lineData);
      const sapTaxRate = Number(lineData.TaxPercentagePerRow ?? lineData.VatPrcnt ?? 0);
      const vatGroup = normalized.VatGroup || String(lineData.TaxCode ?? "").trim();

      return {
        ...normalized,
        ...pickSapLotCollections(lineData),
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

    const attachmentEntry = (result as any).AttachmentEntry || null;
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let attachments: import("@/modules/attachments/attachments.service").FileMetadata[] = [];
    if (attachmentEntry) {
      attachments = await attachmentsService.getSAPAttachment(sessionId, attachmentEntry, dbName);
    }
    if (attachments.length === 0 && dbName) {
      attachments = await attachmentsService.getLocalAttachments(dbName, "GRPO", result.DocEntry);
    }

    return {
      Address: result.Address,
      Address2: result.Address2 || result.ShipToDescription || result.ShipToAddress,
      CardCode: result.CardCode,
      CardName: result.CardName,
      Comments: result.Comments,
      DocCurr: resolveCurrencyCode(result.DocCurrency),
      DocDate: result.DocDate,
      DocDueDate: result.DocDueDate,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocStatus: isDraft ? "Draft" : result.DocumentStatus === "bost_Open" ? "O" : "C",
      DiscountPercent: result.DiscountPercent ?? 0,
      DiscountAmount: (result as unknown as Record<string, unknown>).TotalDiscount ?? 0,
      DocTotal: result.DocTotal,
      AttachmentEntry: attachmentEntry,
      attachments,
      DocumentLines: enrichedLines,
      NumAtCard: result.NumAtCard,
      SalesPersonCode: (result as unknown as Record<string, unknown>).SalesPersonCode,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to fetch GRPO from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves a GRPO by its DocNum from the local HANA database to get its Service Layer DocEntry.
