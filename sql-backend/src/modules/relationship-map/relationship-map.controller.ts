import type { RequestHandler } from "express";

import { relationshipMapService } from "./relationship-map.service";
import type { DocType } from "./relationship-map.service";

const VALID_DOC_TYPES = [
  "sales-quotation",
  "sales-order",
  "ar-invoice",
  "ar-credit-memo",
  "incoming-payment",
  "purchase-quotation",
  "purchase-order",
  "grpo",
  "ap-invoice",
  "ap-credit-memo",
  "outgoing-payment",
  "goods-receipt",
  "goods-issue",
  "transfer-request",
  "transfer",
];

export const getRelationshipMap: RequestHandler = async (req, res, next) => {
  try {
    const docType = String(req.params.docType);
    const docEntry = String(req.params.docEntry);
    const entry = Number(docEntry);

    if (!(VALID_DOC_TYPES as string[]).includes(docType)) {
      return res.status(400).json({
        message: `Invalid docType: ${docType}. Must be one of: ${VALID_DOC_TYPES.join(", ")}`,
        success: false,
      });
    }

    if (!Number.isInteger(entry) || entry <= 0) {
      return res.status(400).json({
        message: "docEntry must be a positive integer",
        success: false,
      });
    }

    const result = await relationshipMapService.getRelationshipMap(docType as DocType, entry);
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const salesRelationshipController = { getRelationshipMap };
