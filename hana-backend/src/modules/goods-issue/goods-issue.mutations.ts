import { serviceLayerClient } from "@/services/service-layer.service";
export const createGoodsIssue = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let absoluteEntry: number | null = null;
    if (
      payload.Attachments &&
      Array.isArray(payload.Attachments) &&
      payload.Attachments.length > 0 &&
      dbName
    ) {
      const { attachmentsService } = await import("@/modules/attachments/attachments.service");
      absoluteEntry = await attachmentsService.createSAPAttachment(
        sessionId,
        dbName,
        payload.Attachments as any[],
      );
    }

    const { masterDataService } = await import("@/modules/master-data/master-data.service");
    const firstWhs = (payload.DocumentLines as Record<string, unknown>[])?.[0]?.WarehouseCode;
    let branchId: number | null = null;
    if (firstWhs) {
      branchId = await masterDataService.getWarehouseBranch(dbName, String(firstWhs));
    }
    if (branchId === null) {
      branchId = await masterDataService.getDefaultBranch(dbName);
    }

    const sapPayload: Record<string, unknown> = {
      DocDate: payload.DocDate,
      TaxDate: payload.TaxDate,
      Comments: payload.Comments,
      JrnlMemo: payload.JrnlMemo,
      Reference2: payload.Ref2,
      ...(branchId !== null ? { BPL_IDAssignedToInvoice: branchId } : {}),
      ...(payload.Series !== undefined && payload.Series !== null
        ? { Series: Number(payload.Series) }
        : {}),
      ...(payload.PriceList !== undefined && payload.PriceList !== null
        ? { PriceList: Number(payload.PriceList) }
        : {}),
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: ((payload.DocumentLines as Record<string, unknown>[]) || []).map((line) => {
        const documentLine: Record<string, unknown> = {
          ItemCode: line.ItemCode,
          Quantity: Number(line.Quantity) || 1,
          UnitPrice: Number(line.UnitPrice) || 0,
        };
        if (line.WarehouseCode) documentLine.WarehouseCode = line.WarehouseCode;
        if (line.UoMCode) documentLine.UoMCode = line.UoMCode;
        if (line.AccountCode) documentLine.AccountCode = line.AccountCode;
        if (line.CostingCode) documentLine.CostingCode = line.CostingCode; // This is the "Branch"
        if (line.InventoryAdjustmentReason) documentLine.U_INVADJMTRES = line.InventoryAdjustmentReason;

        return documentLine;
      }),
    };

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/InventoryGenExits",
      sapPayload,
    )) as { DocEntry: number; DocNum: number };

    const { purgeCache } = await import("@/core/utils/cache");

    if (absoluteEntry !== null && dbName) {
      const { attachmentsService } = await import("@/modules/attachments/attachments.service");
      await attachmentsService.finalizeAndLinkAttachments(
        dbName,
        "GoodsIssues",
        result.DocEntry,
        result.DocNum,
        absoluteEntry,
        payload.Attachments as any[],
      );
    }

    if (dbName) {
      purgeCache(`dash:inventory:${dbName}:`);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "Goods Issue created successfully",
      success: true,
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const updateGoodsIssue = async (
  sessionId: string,
  docEntry: number | string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Comments !== undefined) sapPayload.Comments = payload.Comments;
    if (payload.JrnlMemo !== undefined) sapPayload.JrnlMemo = payload.JrnlMemo;
    if (payload.Ref2 !== undefined) sapPayload.Reference2 = payload.Ref2;
    if (payload.DocumentLines !== undefined) sapPayload.DocumentLines = payload.DocumentLines;

    const { serviceLayerClient } = await import("@/services/service-layer.service");

    let shouldUpdateDoc = true;

    if (payload.Attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        const { attachmentsService } = await import("@/modules/attachments/attachments.service");
        const existingDoc = await serviceLayerClient.request<{
          DocNum: number;
          AttachmentEntry: number | null;
        }>(sessionId, "GET", `/InventoryGenExits(${docEntry})?$select=DocNum,AttachmentEntry`);

        const syncResult = await attachmentsService.syncAttachmentsOnUpdate(
          sessionId,
          dbName,
          "GoodsIssues",
          docEntry,
          existingDoc.DocNum,
          payload.Attachments as any[],
          existingDoc.AttachmentEntry || null,
        );

        if (syncResult.shouldUpdateDoc) {
          sapPayload.AttachmentEntry = syncResult.attachmentEntry;
        }

        if (Object.keys(sapPayload).length === 0) {
          shouldUpdateDoc = false;
        }
      }
    }

    if (shouldUpdateDoc) {
      await serviceLayerClient.request(
        sessionId,
        "PATCH",
        `/InventoryGenExits(${docEntry})`,
        sapPayload,
      );
    }

    const { purgeCache } = await import("@/core/utils/cache");
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:inventory:${session.companyDB}:`);
    }

    return {
      message: "Goods Issue updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};
