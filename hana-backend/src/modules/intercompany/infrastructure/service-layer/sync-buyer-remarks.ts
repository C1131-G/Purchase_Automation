import { serviceLayerClient } from "@/services/service-layer.service";
import { toSapCreateCommentsField } from "@/validation/schemas/inputs/sap-document-fields";

import {
  clampSapDocumentComments,
  hasIcRemarkChain,
  IC_REMARK_PROFILE,
  normalizeIcRemarks,
} from "../ic-remarks-chain";

type BuyerRemarksSyncInput = {
  createdComments: unknown;
  docEntry: number;
  endpoint: string;
  originalComments: unknown;
  sessionId: string;
};

const toComments = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const readComments = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null || !("Comments" in value)) {
    return undefined;
  }
  return toComments(value.Comments);
};

/**
 * SAP may append its own base-document line after a copied document is created.
 * Rebuild it once so IC buyer remarks always remain PQ → RFQ → PO.
 */
export const syncBuyerRemarksAfterCreate = async ({
  createdComments,
  docEntry,
  endpoint,
  originalComments,
  sessionId,
}: BuyerRemarksSyncInput): Promise<void> => {
  const original = toComments(originalComments);
  if (!hasIcRemarkChain(original)) {
    return;
  }

  let persisted = toComments(createdComments);
  if (!persisted) {
    const document = await serviceLayerClient.request(
      sessionId,
      "GET",
      `${endpoint}(${docEntry})?$select=Comments`,
    );
    persisted = readComments(document);
  }
  if (!persisted) {
    return;
  }

  const canonical = toSapCreateCommentsField(
    clampSapDocumentComments(normalizeIcRemarks(persisted, IC_REMARK_PROFILE.BUYER)),
  );
  if (canonical === persisted) {
    return;
  }

  await serviceLayerClient.request(sessionId, "PATCH", `${endpoint}(${docEntry})`, {
    Comments: canonical,
  });
};
