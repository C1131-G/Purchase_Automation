import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/db/tenant-query";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import { toSapCommentsField } from "@/validation/schemas/inputs/sap-document-fields";
// Retrieves a paginated list of A/P Invoices from the tenant's HANA database.
// Uses raw UNION ALL queries to combine real documents and ODRF drafts.

export const updateInvoice = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  const isDraft = payload.isDraft === true;

  try {
    const sapPayload: Record<string, unknown> = {};
    const endpoint = isDraft ? `/Drafts(${id})` : `/PurchaseInvoices(${id})`;

    if (payload.attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbNameResolved = session?.companyDB || "";
      if (dbNameResolved) {
        let docNum: string | number = id;
        let existingAttachmentEntry: number | null = null;
        let successDb = false;
        if (!isDraft) {
          try {
            const invoiceRepo = await getTenantRepository(dbNameResolved, APInvoiceSchema);
            const invoiceDoc = await invoiceRepo.findOne({
              where: { docEntry: Number(id) },
              select: ["docNum", "atcEntry"],
            });
            if (invoiceDoc) {
              docNum = invoiceDoc.docNum;
              existingAttachmentEntry = invoiceDoc.atcEntry ?? null;
              successDb = true;
            }
          } catch (dbErr: any) {
            logger.warn(
              { id, err: dbErr },
              "Failed to query database for doc info, falling back to Service Layer GET",
            );
          }
        }

        if (!successDb) {
          // Fallback to Service Layer GET if database query fails or document not found (e.g. for drafts)
          try {
            const getEndpoint = isDraft
              ? `/Drafts(${id})?$select=DocNum,AttachmentEntry`
              : `/PurchaseInvoices(${id})?$select=DocNum,AttachmentEntry`;
            const docData = await serviceLayerClient.request<any>(sessionId, "GET", getEndpoint);
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
            dbNameResolved,
            "APInvoice",
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
      sapPayload.Comments = toSapCommentsField(payload.Comments);
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

    // PATCH request to SAP: Partial updates are standard for meta fields like comments.
    await serviceLayerClient.request(sessionId, "PATCH", endpoint, sapPayload, true, {
      "B1S-ReplaceCollectionsOnPatch": "true",
    });

    // Invalidate dashboard metrics to reflect any potential status changes (though comments usually don't).
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB && !isDraft) {
      purgeCache(`dashboard:overview:${session.companyDB}`);
    }

    return {
      message: isDraft
        ? "A/P Invoice draft updated successfully"
        : "A/P Invoice updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
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
      purgeCache(`dashboard:overview:${session.companyDB}`);
    }

    return { message: "A/P Invoice cancelled successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to cancel A/P Invoice",
    });
    throw caughtError;
  }
};

// Reopens a closed A/P Invoice in the SAP system.
