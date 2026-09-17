import AppError from "@/core/errors/app-error";
import { executeTenantQuery, getTenantRepository } from "@/db/tenant-query";
// Data Access & Schemas
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { getGRPO } from "./grpo.detail-po.queries";

export const getGRPOByDocNum = async (
  sessionId: string,
  dbName: string,
  docNum: string,
  draftDocEntry?: string,
) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    throw new AppError("DocNum is required", 400, "VALIDATION_ERROR");
  }

  if (draftDocEntry) {
    const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '20' AND "DocEntry" = ?`;
    const draftMatch = (await executeTenantQuery(dbName, draftQuery, [
      Number(draftDocEntry),
    ])) as any[];

    if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
      return getGRPO(sessionId, String(draftMatch[0].DocEntry), true);
    }
  }

  // 1. Check OPDN (real document)
  const repo = await getTenantRepository(dbName, GRPOSchema);
  const match = await repo
    .createQueryBuilder("grpo")
    .select(["grpo.docEntry"])
    .where("CAST(grpo.docNum AS NVARCHAR) = :docNum", {
      docNum: normalizedDocNum,
    })
    .getOne();

  if (match?.docEntry) {
    const grpoDocEntry = String(match.docEntry);
    const grpoDetail = await getGRPO(sessionId, grpoDocEntry);

    // Remaining open quantity per line (was consumed-by-AP-Invoice; that document is removed).
    const consumedByLine = new Map<number, number>();

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
  }

  // 2. Check ODRF (draft document)
  const draftQuery = `SELECT "DocEntry" FROM "ODRF" WHERE "ObjType" = '20' AND CAST("DocNum" AS NVARCHAR) = ?`;
  const draftMatch = (await executeTenantQuery(dbName, draftQuery, [normalizedDocNum])) as any[];

  if (draftMatch && draftMatch.length > 0 && draftMatch[0].DocEntry) {
    return getGRPO(sessionId, String(draftMatch[0].DocEntry), true);
  }

  throw new AppError("GRPO not found", 404, "NOT_FOUND");
};

// Creates a GRPO document in SAP. Crucially, it links each line back to its source Purchase Order.
