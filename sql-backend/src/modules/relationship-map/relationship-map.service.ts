import { getApRelationshipMap } from "./relationship-map.ap";
import { getArRelationshipMap } from "./relationship-map.ar";
import { getInventoryRelationshipMap } from "./relationship-map.inventory";

export type DocType =
  | "sales-quotation"
  | "sales-order"
  | "ar-invoice"
  | "ar-credit-memo"
  | "incoming-payment"
  | "purchase-quotation"
  | "purchase-order"
  | "grpo"
  | "ap-invoice"
  | "ap-credit-memo"
  | "outgoing-payment"
  | "goods-receipt"
  | "goods-issue"
  | "transfer-request"
  | "transfer";

const AR_DOC_TYPES = new Set([
  "sales-quotation",
  "sales-order",
  "ar-invoice",
  "ar-credit-memo",
  "incoming-payment",
]);

const AP_DOC_TYPES = new Set([
  "purchase-quotation",
  "purchase-order",
  "grpo",
  "ap-invoice",
  "ap-credit-memo",
  "outgoing-payment",
]);

const INVENTORY_DOC_TYPES = new Set([
  "goods-receipt",
  "goods-issue",
  "transfer-request",
  "transfer",
]);

export const getRelationshipMap = (docType: DocType, docEntry: number) => {
  if (AR_DOC_TYPES.has(docType)) {
    return getArRelationshipMap(docType, docEntry);
  }
  if (AP_DOC_TYPES.has(docType)) {
    return getApRelationshipMap(docType, docEntry);
  }
  if (INVENTORY_DOC_TYPES.has(docType)) {
    return getInventoryRelationshipMap(docType, docEntry);
  }
  throw new Error(`Unknown docType: ${docType}`);
};

export const relationshipMapService = { getRelationshipMap };
