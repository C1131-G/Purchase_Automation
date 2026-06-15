import { logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "./service-layer.service";
import { financialPeriodService } from "./financial-period.service";

/**
 * Adjusts the DocDueDate (Due Date / Delivery Date) to fall within the active posting period's end date
 * if it exceeds it. This prevents SAP Service Layer from rejecting the document with a
 * "date deviates from permissible range" error for documents (like PO, PQ, SO, SQ) where future delivery dates
 * are requested but the active posting period settings strictly block header due dates outside the period.
 */
export const adjustDocDueDateToActivePeriod = async (
  sessionId: string,
  docDueDate: string | undefined,
): Promise<string | undefined> => {
  if (!docDueDate) {
    return docDueDate;
  }

  const session = serviceLayerClient.getSession(sessionId);
  const dbName = session?.companyDB;
  if (!dbName) {
    return docDueDate;
  }

  try {
    const activePeriod = await financialPeriodService.getActivePeriod(dbName);
    if (activePeriod && activePeriod.T_RefDate) {
      // Normalize T_RefDate (e.g. 2026-06-30T00:00:00.000Z -> 2026-06-30)
      const tRefDateStr = new Date(activePeriod.T_RefDate).toISOString().slice(0, 10);

      // Normalize user-entered docDueDate (e.g. 20260706 -> 2026-07-06 or 2026-07-06T00:00:00 -> 2026-07-06)
      let cleanDocDueDate = docDueDate.trim();
      if (/^\d{8}$/.test(cleanDocDueDate)) {
        cleanDocDueDate = `${cleanDocDueDate.slice(0, 4)}-${cleanDocDueDate.slice(4, 6)}-${cleanDocDueDate.slice(6, 8)}`;
      } else {
        cleanDocDueDate = cleanDocDueDate.slice(0, 10);
      }

      if (cleanDocDueDate && cleanDocDueDate > tRefDateStr) {
        logger.info({
          msg: "Adjusting DocDueDate to fall within active financial period end",
          original: docDueDate,
          adjusted: tRefDateStr,
          dbName,
        });
        return tRefDateStr;
      }
    }
  } catch (error) {
    logger.warn({
      msg: "Failed to check financial period for date adjustment",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return docDueDate;
};

const formatDateToDDMMYYYY = (dateStr: string): string => {
  const clean = dateStr.trim();
  let y = "";
  let m = "";
  let d = "";
  if (/^\d{8}$/.test(clean)) {
    y = clean.slice(0, 4);
    m = clean.slice(4, 6);
    d = clean.slice(6, 8);
  } else {
    y = clean.slice(0, 4);
    m = clean.slice(5, 7);
    d = clean.slice(8, 10);
  }
  return `${d}-${m}-${y}`;
};

/**
 * Adjusts DocDueDate/RequriedDate in the SAP payload to fall within the active financial period.
 * If DocDueDate is adjusted, it appends a remark to the Comments field.
 */
export const adjustPayloadDates = async (
  sessionId: string,
  sapPayload: any,
  isUpdate = false,
  documentEndpoint?: string,
  dateLabel = "Delivery date",
): Promise<void> => {
  let docDueDateAdjusted = false;
  let docDueDateOrig = "";
  let docDueDateNew = "";

  if (sapPayload.DocDueDate) {
    const original = sapPayload.DocDueDate;
    const adjustedDate = await adjustDocDueDateToActivePeriod(sessionId, original);
    if (adjustedDate !== original) {
      sapPayload.DocDueDate = adjustedDate;
      docDueDateAdjusted = true;
      docDueDateOrig = original;
      docDueDateNew = adjustedDate || "";
    }
  }

  if (sapPayload.RequriedDate) {
    const original = sapPayload.RequriedDate;
    const adjustedDate = await adjustDocDueDateToActivePeriod(sessionId, original);
    if (adjustedDate !== original) {
      sapPayload.RequriedDate = adjustedDate;
    }
  }

  const remarks: string[] = [];

  if (docDueDateAdjusted) {
    remarks.push(
      `${dateLabel} adjusted from ${formatDateToDDMMYYYY(docDueDateOrig)} to ${formatDateToDDMMYYYY(docDueDateNew)} due to financial period`,
    );
  }

  if (remarks.length > 0) {
    const appendRemarks = (existingComments: string) => {
      let updated = existingComments;
      for (const remark of remarks) {
        if (!updated.includes(remark)) {
          updated = updated ? `${updated}\n${remark}` : remark;
        }
      }
      return updated;
    };

    if (isUpdate && documentEndpoint && sapPayload.Comments === undefined) {
      try {
        const existingDoc = (await serviceLayerClient.request(
          sessionId,
          "GET",
          documentEndpoint,
        )) as { Comments?: string };
        sapPayload.Comments = appendRemarks(existingDoc?.Comments || "");
      } catch (err) {
        logger.warn({
          msg: "Failed to fetch existing comments during date adjustment update",
          error: err instanceof Error ? err.message : String(err),
        });
        sapPayload.Comments = appendRemarks("");
      }
    } else {
      sapPayload.Comments = appendRemarks(sapPayload.Comments || "");
    }
  }
};
