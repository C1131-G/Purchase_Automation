// Purchase Order Service: Orchestrates the procurement lifecycle. Manages HANA database queries for high-performance listings and Service Layer requests for PO creation and updates.

// Core & Utils
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/db/tenant-query";
// Data Access & Schemas
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import { afterPoUpdated, assertIcPoEditable } from "@/modules/intercompany";
// Retrieves a paginated list of Purchase Orders from the HANA database.

export const updatePurchaseOrder = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const isDraft = payload.isDraft === true;
    const sapPayload: Record<string, unknown> = {};
    const sessionBeforePatch = serviceLayerClient.getSession(sessionId);
    const companyDb = sessionBeforePatch?.companyDB?.trim();
    if (!isDraft && companyDb) {
      await assertIcPoEditable(companyDb, Number(id));
    }

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        // Fetch DocNum and existing AttachmentEntry directly from HANA database via TypeORM
        let docNum: string | number = id;
        let existingAttachmentEntry: number | null = null;
        let successDb = false;
        try {
          const poRepo = await getTenantRepository(dbName, PurchaseOrderSchema);
          const poDoc = await poRepo.findOne({
            where: { docEntry: Number(id) },
            select: ["docNum", "atcEntry"],
          });
          if (poDoc) {
            docNum = poDoc.docNum;
            existingAttachmentEntry = poDoc.atcEntry ?? null;
            successDb = true;
          }
        } catch (dbErr: any) {
          logger.warn(
            { id, err: dbErr },
            "Failed to query database for doc info, falling back to Service Layer GET",
          );
        }

        if (!successDb) {
          // Fallback to Service Layer GET if database query fails or document not found (e.g. for drafts)
          try {
            const docData = await serviceLayerClient.request<any>(
              sessionId,
              "GET",
              isDraft
                ? `/Drafts(${id})?$select=DocNum,AttachmentEntry`
                : `/PurchaseOrders(${id})?$select=DocNum,AttachmentEntry`,
            );
            if (docData?.DocNum) {
              docNum = docData.DocNum;
            }
            if (docData?.AttachmentEntry) {
              existingAttachmentEntry = docData.AttachmentEntry;
            }
          } catch (err: any) {
            logger.warn({ id, err }, "Failed to fetch doc info from Service Layer");
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

    await serviceLayerClient.request(
      sessionId,
      "PATCH",
      isDraft ? `/Drafts(${id})` : `/PurchaseOrders(${id})`,
      sapPayload,
      true,
      { "B1S-ReplaceCollectionsOnPatch": "true" },
    );

    // Dashboard metrics must be refreshed to reflect potential total spend changes.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dashboard:overview:${session.companyDB}`);
    }

    if (!isDraft && companyDb) {
      await afterPoUpdated({
        address: typeof sapPayload.Address === "string" ? sapPayload.Address : null,
        address2: typeof sapPayload.Address2 === "string" ? sapPayload.Address2 : null,
        cardCode: String(payload.CardCode ?? sapPayload.CardCode ?? ""),
        dbName: companyDb,
        docDate: sapPayload.DocDate,
        docDueDate: sapPayload.DocDueDate,
        docEntry: Number(id),
        lines: Array.isArray(sapPayload.DocumentLines)
          ? (sapPayload.DocumentLines as Record<string, unknown>[])
          : [],
        numAtCard: sapPayload.NumAtCard,
        remarks: typeof sapPayload.Comments === "string" ? sapPayload.Comments : undefined,
        salesPersonCode:
          typeof sapPayload.SalesPersonCode === "number" ||
          typeof sapPayload.SalesPersonCode === "string"
            ? sapPayload.SalesPersonCode
            : null,
      });
    }

    return {
      message: isDraft
        ? "Purchase Order Draft saved successfully"
        : "Purchase Order updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
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
      purgeCache(`dashboard:overview:${session.companyDB}`);
    }

    return {
      message: "Purchase Order cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to cancel purchase order in Service Layer",
    });
    throw caughtError;
  }
};
