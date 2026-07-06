import type { Request, Response, NextFunction } from "express";

const KEY_MAP: Record<string, string> = {
  // Query parameters
  CardCode: "cardCode",
  CardName: "cardName",
  DocNum: "docNum",
  DocStatus: "docStatus",
  DocDateStart: "dateFrom",
  DocDateEnd: "dateTo",
  DocTotal: "docTotal",
  DocTotalOperator: "docTotalOperator",
  limit: "limit",
  page: "page",
  sortBy: "sortBy",
  sortOrder: "sortOrder",

  // Header / Common fields
  Address: "address",
  Address2: "address2",
  Comments: "comments",
  DocCurr: "docCurrency",
  DocDate: "docDate",
  DocDueDate: "docDueDate",
  NumAtCard: "numAtCard",
  SalesPersonCode: "salesPersonCode",
  DiscountPercent: "discountPercent",

  // Document lines fields
  DocumentLines: "lines",
  LineNum: "lineNum",
  ItemCode: "itemCode",
  ItemDescription: "itemDescription",
  Quantity: "quantity",
  Price: "price",
  UnitPrice: "unitPrice",
  VatGroup: "vatGroup",
  VatPrcnt: "vatPercent",
  WarehouseCode: "warehouseCode",
  UoMCode: "uomCode",
  UoMEntry: "uomEntry",
  LineTotal: "lineTotal",
  BaseEntry: "baseEntry",
  BaseLine: "baseLine",
  BaseType: "baseType",
  OpenQty: "openQty",
  TaxCode: "vatGroup",
  AcctCode: "acctCode",
  FromWarehouseCode: "fromWarehouseCode",
  Dscription: "dscription",
  LineStatus: "lineStatus",
};

// Recursively convert object/array keys using KEY_MAP or first-letter-lowercase fallback
const transformKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const nextObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const nextKey = KEY_MAP[key] ?? key.charAt(0).toLowerCase() + key.slice(1);
      nextObj[nextKey] = transformKeys(value);
    }
    return nextObj;
  }
  return obj;
};

export const requestTransformerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip transformation for item-master, master-data, and files/attachments upload
  if (
    req.originalUrl.includes("/item-master") ||
    req.originalUrl.includes("/master-data") ||
    req.originalUrl.includes("/attachments")
  ) {
    return next();
  }

  if (req.query) {
    const transformed = transformKeys(req.query);
    for (const key of Object.keys(req.query)) {
      delete req.query[key];
    }
    Object.assign(req.query, transformed);
  }
  if (req.body) {
    req.body = transformKeys(req.body);
  }
  next();
};
