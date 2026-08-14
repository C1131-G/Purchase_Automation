// Purchase Quotation Service: Orchestrates vendor quotation processing flows. Interfaces with HANA for high-volume quotation queries and Service Layer for document lifecycle management.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/db/tenant-query";
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import { serviceLayerClient } from "@/services/service-layer.service";
import { attachmentsService } from "@/modules/attachments/attachments.service";
import { afterPqSaved, assertIcPqEditable } from "@/modules/intercompany";
import { toSapCommentsField } from "@/validation/schemas/inputs/sap-document-fields";
import type { IcHookResult } from "@/modules/intercompany";
const normalizeSapDateValue = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw.slice(0, 10);
};

// Fetches a filtered and paginated list of Purchase Quotations from the tenant-specific HANA database.

export const updatePurchaseQuotation = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const isDraft = payload.isDraft === true;
    const sapPayload: Record<string, unknown> = {};

    if (!isDraft) {
      const companyDb = serviceLayerClient.getSession(sessionId)?.companyDB?.trim();
      if (companyDb) {
        await assertIcPqEditable(companyDb, Number(id));
      }
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
          const pqRepo = await getTenantRepository(dbName, PurchaseQuotationSchema);
          const pqDoc = await pqRepo.findOne({
            where: { docEntry: Number(id) },
            select: ["docNum", "atcEntry"],
          });
          if (pqDoc) {
            docNum = pqDoc.docNum;
            existingAttachmentEntry = pqDoc.atcEntry ?? null;
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
                : `/PurchaseQuotations(${id})?$select=DocNum,AttachmentEntry`,
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
            "PurchaseQuotation",
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
    if ((payload as Record<string, unknown>).RequriedDate !== undefined) {
      sapPayload.RequriedDate = (payload as Record<string, unknown>).RequriedDate;
    }
    if (payload.SalesPersonCode !== undefined) {
      sapPayload.SalesPersonCode = payload.SalesPersonCode;
    }

    const lines = payload.DocumentLines as Record<string, unknown>[];
    if (lines) {
      sapPayload.DocumentLines = lines.map((line) => {
        // PQ line split — write each field independently (no cross-copy):
        //   Quantity          → quoted qty
        //   RequiredQuantity  → required qty (PQT1.PQTReqQty)
        //   ReqDate           → required date
        //   ShipDate          → quoted date (omit when empty)
        const reqDate = normalizeSapDateValue(
          line.ReqDate ??
            line.RequiredDate ??
            line.requiredDate ??
            (payload as Record<string, unknown>).RequriedDate ??
            payload.DocDueDate ??
            payload.DocDate,
        );
        const shipDateRaw = line.ShipDate ?? line.QuotedDate ?? line.quotedDate;
        const shipDate = shipDateRaw ? normalizeSapDateValue(shipDateRaw) : "";
        const quotedQty = Number(line.Quantity ?? 0);
        const hasRequiredQty =
          line.RequiredQuantity !== undefined && line.RequiredQuantity !== null;
        const hasRequiredQtyAlt =
          line.requiredQuantity !== undefined && line.requiredQuantity !== null;
        const requiredQty = hasRequiredQty
          ? Number(line.RequiredQuantity)
          : hasRequiredQtyAlt
            ? Number(line.requiredQuantity)
            : 0;
        const docLine: Record<string, unknown> = {
          LineNum: line.LineNum !== undefined ? Number(line.LineNum) : undefined,
          ItemCode: line.ItemCode as string,
          Quantity: Number.isFinite(quotedQty) ? quotedQty : 0,
          RequiredQuantity: Number.isFinite(requiredQty) ? requiredQty : 0,
          UnitPrice: (line.UnitPrice || line.Price) as number,
          DiscountPercent: Number(line.DiscountPercent ?? 0),
          UoMEntry: (line.UoMEntry ?? line.UomEntry) as number | undefined,
          VatGroup: line.VatGroup as string,
          WarehouseCode: line.WarehouseCode as string,
        };
        if (reqDate) {
          docLine.ReqDate = reqDate;
        }
        if (shipDate) {
          docLine.ShipDate = shipDate;
        }
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

        if (Number.isFinite(line.BaseEntry) && Number.isFinite(line.BaseLine)) {
          docLine.BaseType = line.BaseType;
          docLine.BaseEntry = line.BaseEntry;
          docLine.BaseLine = line.BaseLine;
        }

        return docLine;
      });
    }

    logger.info({
      changedFields: Object.keys(sapPayload),
      id,
      lineCount: Array.isArray(sapPayload.DocumentLines) ? sapPayload.DocumentLines.length : 0,
      msg: "Purchase quotation update payload prepared",
    });

    await serviceLayerClient.request(
      sessionId,
      "PATCH",
      isDraft ? `/Drafts(${id})` : `/PurchaseQuotations(${id})`,
      sapPayload,
      true,
      {
        "B1S-ReplaceCollectionsOnPatch": "true",
      },
    );

    const session = serviceLayerClient.getSession(sessionId);
    const companyDB = session?.companyDB || "";
    if (companyDB) {
      purgeCache(`dashboard:overview:${companyDB}`);
    }

    // Flow 1 IC: direct PQ only (not draft). Idempotent if RFQ already exists.
    let intercompany: IcHookResult | undefined;
    if (!isDraft) {
      try {
        const lines = Array.isArray(payload.DocumentLines)
          ? (payload.DocumentLines as Record<string, unknown>[])
          : [];
        intercompany = await afterPqSaved({
          address: payload.Address != null ? String(payload.Address) : null,
          address2: payload.Address2 != null ? String(payload.Address2) : null,
          cardCode: String(payload.CardCode ?? sapPayload.CardCode ?? ""),
          cardName: payload.CardName != null ? String(payload.CardName) : null,
          // Parent typed Comments from payload; if omitted, leave null (capture may skip if RFQ exists).
          comments: payload.Comments != null ? String(payload.Comments) : null,
          dbName: companyDB,
          docDate: payload.DocDate,
          docDueDate: payload.DocDueDate,
          docEntry: Number(id),
          docNum: null,
          lines,
          numAtCard: payload.NumAtCard != null ? String(payload.NumAtCard) : null,
          requiredDate:
            (payload as Record<string, unknown>).RequriedDate ??
            payload.DocDueDate ??
            payload.DocDate,
          salesPersonCode: (() => {
            const raw =
              (payload as Record<string, unknown>).SalesPersonCode ??
              (payload as Record<string, unknown>).salesPersonCode;
            if (raw === null || raw === undefined || raw === "") {
              return null;
            }
            return typeof raw === "number" || typeof raw === "string" ? raw : String(raw);
          })(),
        });
      } catch (icErr: unknown) {
        logger.error({
          err: icErr instanceof Error ? icErr : new Error(String(icErr)),
          msg: "afterPqSaved threw unexpectedly; PQ remains updated",
        });
        intercompany = {
          message: (icErr instanceof Error ? icErr.message : String(icErr)).slice(0, 2000),
          status: "failed",
        };
      }
    }

    return {
      intercompany,
      message: isDraft
        ? "Purchase Quotation Draft updated successfully"
        : "Purchase Quotation updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to update purchase quotation in Service Layer",
    });
    throw caughtError;
  }
};

// Triggers the standard cancellation procedure in SAP B1 for the given Purchase Quotation.
