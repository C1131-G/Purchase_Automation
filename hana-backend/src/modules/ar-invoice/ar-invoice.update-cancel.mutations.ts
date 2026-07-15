// A/R Invoice Service: Logic for A/R Invoices (Sales), utilizing HANA for listings and SAP Service Layer for transaction management.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/db/tenant-query";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";

// Fetches a paginated list of A/R Invoices from HANA with dynamic filtering support.
// Uses a UNION ALL pattern to combine final documents (OINV) with drafts (ODRF, ObjType='13').

export const updateInvoice = async (
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
            const invoiceRepo = await getTenantRepository(dbName, ARInvoiceSchema);
            const invoiceDoc = await invoiceRepo.findOne({
              where: { docEntry: Number(id) },
              select: ["docNum", "atcEntry"],
            });
            if (invoiceDoc) {
              docNum = invoiceDoc.docNum;
              existingAttachmentEntry = invoiceDoc.atcEntry ?? null;
            }
          } catch (dbErr: any) {
            logger.warn(
              { id, err: dbErr },
              "Failed to query database for doc info, falling back to Service Layer GET",
            );
            // Fallback to Service Layer GET if database query fails
            try {
              const docData = await serviceLayerClient.request<any>(
                sessionId,
                "GET",
                `/Invoices(${id})?$select=DocNum,AttachmentEntry`,
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
            logger.warn({ id: docEntry, err }, "Failed to fetch doc info from Service Layer");
          }
        }

        const { attachmentEntry, shouldUpdateDoc } =
          await attachmentsService.syncAttachmentsOnUpdate(
            sessionId,
            dbName,
            isDraft ? "ARInvoiceDraft" : "ARInvoice",
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

    if (Object.hasOwn(payload, "Comments")) {
      sapPayload.Comments = payload.Comments;
    }
    if (Object.hasOwn(payload, "Address")) {
      sapPayload.Address = payload.Address;
    }
    if (Object.hasOwn(payload, "Address2")) {
      sapPayload.Address2 = payload.Address2;
    }
    if (payload.DocDate !== undefined) {
      sapPayload.DocDate = payload.DocDate;
    }
    if (payload.DocDueDate !== undefined) {
      sapPayload.DocDueDate = payload.DocDueDate;
    }
    const endpoint = isDraft ? `/Drafts(${docEntry})` : `/Invoices(${id})`;
    if (Object.hasOwn(payload, "NumAtCard")) {
      sapPayload.NumAtCard = payload.NumAtCard;
    }

    // Recalculate discount if document lines are provided
    if (Array.isArray(payload.DocumentLines)) {
      const lines = payload.DocumentLines as Record<string, unknown>[];

      sapPayload.DocumentLines = lines.map((line) => {
        const docLine: Record<string, unknown> = {
          LineNum: line.LineNum !== undefined ? Number(line.LineNum) : undefined,
          ItemCode: line.ItemCode as string,
          Quantity: line.Quantity as number,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          VatGroup: line.VatGroup as string,
          WarehouseCode: line.WarehouseCode as string,
        };
        const uomEntry = Number(line.UoMEntry ?? line.UomEntry);
        if (Number.isFinite(uomEntry) && uomEntry > 0) {
          docLine.UoMEntry = Math.trunc(uomEntry);
          docLine.UseBaseUnit = "tNO";
        } else {
          const uomCode = line.UoMCode ?? line.UomCode;
          if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
            docLine.UoMCode = uomCode as string | number;
            docLine.UseBaseUnit = "tNO";
          }
        }
        return docLine;
      });
    }

    await serviceLayerClient.request(sessionId, "PATCH", endpoint, sapPayload, true, {
      "B1S-ReplaceCollectionsOnPatch": "true",
    });

    // Invalidate tenant-specific sales dashboard cache.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: isDraft
        ? "A/R Invoice Draft saved successfully"
        : "A/R Invoice updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to update A/R Invoice",
    });
    throw caughtError;
  }
};

// Executes the cancellation procedure for an A/R Invoice in SAP B1.

export const cancelInvoice = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Invoices(${id})/Cancel`);

    // Dashboard caches Must be purged to reflect the loss of revenue/receivables.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "A/R Invoice canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to cancel A/R Invoice",
    });
    throw caughtError;
  }
};
