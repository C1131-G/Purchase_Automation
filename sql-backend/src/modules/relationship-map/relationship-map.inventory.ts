import { getDb } from "@/db/client";
import type { DynRow } from "@/types/drizzle.types";

import { relationshipMapRepository } from "./relationship-map.repository";
import { toRelationNode } from "./relationship-map.to-relation";

export const getInventoryRelationshipMap = async (docType: string, docEntry: number) => {
  const db = getDb();
  let goodsReceiptId: number | null = null;
  let goodsIssueId: number | null = null;
  let transferRequestId: number | null = null;
  let transferId: number | null = null;

  switch (docType) {
    case "goods-receipt": {
      goodsReceiptId = docEntry;
      break;
    }
    case "goods-issue": {
      goodsIssueId = docEntry;
      break;
    }
    case "transfer-request": {
      transferRequestId = docEntry;
      break;
    }
    case "transfer": {
      transferId = docEntry;
      break;
    }
  }

  if (transferRequestId) {
    const transferLines = await relationshipMapRepository.findInventoryTransferLinesByBaseEntry(
      db,
      [transferRequestId],
    );
    const transferEntries = [...new Set(transferLines.map((line: DynRow) => line.docEntry))];
    if (transferEntries.length > 0) {
      transferId ??= transferEntries[0] as number;
    }
  }

  if (transferId && !transferRequestId) {
    const transferLines = await relationshipMapRepository.findInventoryTransferLines(
      db,
      transferId,
    );
    const baseEntries = [
      ...new Set(
        transferLines
          .map((line: DynRow) => line.baseEntry)
          .filter((base: unknown): base is number => typeof base === "number"),
      ),
    ];
    if (baseEntries.length > 0) {
      transferRequestId = baseEntries[0] as number;
    }
  }

  const goodsReceipt = goodsReceiptId
    ? await relationshipMapRepository.findGoodsReceipt(db, goodsReceiptId)
    : null;
  const goodsIssue = goodsIssueId
    ? await relationshipMapRepository.findGoodsIssue(db, goodsIssueId)
    : null;
  const transferRequest = transferRequestId
    ? await relationshipMapRepository.findInventoryTransferRequest(db, transferRequestId)
    : null;
  const transfer = transferId
    ? await relationshipMapRepository.findInventoryTransfer(db, transferId)
    : null;

  return {
    goodsIssue: goodsIssue ? [toRelationNode(goodsIssue)] : [],
    goodsReceipt: goodsReceipt ? [toRelationNode(goodsReceipt)] : [],
    transfer: transfer ? [toRelationNode(transfer)] : [],
    transferRequest: transferRequest ? [toRelationNode(transferRequest)] : [],
  };
};
