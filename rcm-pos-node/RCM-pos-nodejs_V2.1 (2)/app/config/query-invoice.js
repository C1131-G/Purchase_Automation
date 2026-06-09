const { dbCreds } = require("./hana-db");

/**
 * Get Open Invoices
 */
exports.invoice = `SELECT DISTINCT 
    T0."DocNum", 
    T0."DocEntry", 
    T0."DocDate", 
    T0."DocTime", 
    T0."DocDueDate", 
    T0."BPLId" AS "branch",
    T0."CardCode", 
    T0."CardName", 
    T2."Cellular", 
    T0."NumAtCard", 
    T2."LicTradNum", 
    T4."U_Change" AS "Change",
    T0."Comments", 
    T0."DocStatus", 
    T0."DocCur", 
    T0."DocRate", 
    T0."DocTotal", 
    T0."DocTotalFC",
    T0."DiscPrcnt" AS "DiscountPercent", 
    T0."DiscSum" AS "TotalDiscount", 
    T0."DiscSumFC" AS "TotalDiscountFC",
    T0."VatSum", 
    T0."VatPercent", 
    T0."GroupNum" AS "PaymentTermCode", 
    T0."U_PaymentType", 
    T0."SlpCode" AS "SalesPersonCode",
    T5."SlpName" AS "SalesPersonName",
    T0."Address2" AS "ShipTo", 
    T0."U_CODEmail", 
    T0."U_CODCntName", 
    T0."U_CODTlePhone", 
    T0."U_Location", 
    T0."U_IsReprinted"
FROM ${dbCreds.CompanyDB}.OINV T0
INNER JOIN ${dbCreds.CompanyDB}.INV1 T1 
    ON T0."DocEntry" = T1."DocEntry"
LEFT JOIN ${dbCreds.CompanyDB}.OCRD T2 
    ON T0."CardCode" = T2."CardCode"
LEFT JOIN ${dbCreds.CompanyDB}.RCT2 T3 
    ON T0."DocEntry" = T3."DocEntry"
LEFT JOIN ${dbCreds.CompanyDB}.ORCT T4 
    ON T3."DocNum" = T4."DocEntry"
LEFT JOIN ${dbCreds.CompanyDB}.OSLP T5 
    ON T0."SlpCode" = T5."SlpCode"
WHERE 
    T0."DocType" = 'I'
    AND T0."DocEntry" = T1."DocEntry"`;

/**
 * Get Open Items Details under an Invoice
 */
exports.itemListForInvoice = `
SELECT 
    T0."DocNum", 
    T0."DocEntry",
    T1."LineNum", 
    T1."ItemCode", 
    ITM."ItemName", 
    T1."LineStatus", 
    T1."Quantity", 
    T1."OpenQty", 
    T1."Price", 
    T1."DiscPrcnt" AS "DiscountPercent", 
    T1."unitMsr" AS "UomCode", 
    T1."VatGroup",
    T1."WhsCode", 
    T1."VatPrcnt" AS "TaxPercent", 
    T1."VatSum" AS "TaxLocal", 
    T1."VatSumFrgn" AS "TaxForeign",
    T1."LineTotal", 
    T1."U_ReturnedQty", 
    T1."U_RemainingOpenQty", 
    T1."PriceAfVAT" AS "NetUnitPrice", 
    T1."PriceBefDi" AS "PriceBeforeDiscount",
    ITM."ItmsGrpCod",
    T1."CogsOcrCod" AS "COGSBranch"
FROM ${dbCreds.CompanyDB}.OINV T0
INNER JOIN ${dbCreds.CompanyDB}.INV1 T1 
    ON T0."DocEntry" = T1."DocEntry"
INNER JOIN ${dbCreds.CompanyDB}.OITM ITM 
    ON T1."ItemCode" = ITM."ItemCode"
WHERE T0."DocNum" IN 
`;

exports.invoiceFircaURL = `SELECT 
    T0."DocNum", 
    T0."U_VerifyURL"
FROM ${dbCreds.CompanyDB}.OINV T0
WHERE T0."DocNum" = ?`;

exports.invoiceAttachmentEntry = `SELECT 
    T0."DocNum", 
    T0."AtcEntry"
FROM ${dbCreds.CompanyDB}.OINV T0
WHERE T0."DocEntry" = ?`;

exports.invoiceUDFData = `SELECT 
    T0."DocNum", 
    T0."U_InvCount", 
    T0."U_SDCTime", 
    T0."U_SDCInvNum", 
    T0."U_VehicleNo"
FROM ${dbCreds.CompanyDB}.OINV T0
WHERE T0."DocNum" = ?`;

exports.updateTransRef = `UPDATE ${dbCreds.CompanyDB}.OCRH T0
SET T0."TransRef" = ?
WHERE T0."RctAbs" = ?`;

exports.updateInvoiceItem = `UPDATE ${dbCreds.CompanyDB}.INV1 T1
SET 
    T1."U_ReturnedQty" = ?, 
    T1."U_RemainingOpenQty" = ?
WHERE 
    T1."DocEntry" = ? 
    AND T1."LineNum" = ?`;

exports.updateInvoiceReprintStatus = `UPDATE ${dbCreds.CompanyDB}.OINV T0
SET T0."U_IsReprinted" = 'Y'
WHERE T0."DocEntry" = ?`;

exports.invoiceDeliveyCodeData = `SELECT 
    T0."DeliveryCode", 
    T0."DocNum"
FROM ${dbCreds.CompanyDB}.OINV T0
WHERE T0."DocNum" = ?`;

exports.updateSalesBatchSelectionDocNum = `UPDATE ${dbCreds.CompanyDB}.INV1 T1
SET T1."U_DocNum" = ?
WHERE 
    T1."DocEntry" = ? 
    AND T1."ItemCode" = ?`;

exports.getUniqueId = `SELECT 
    T0."DocNum", 
    T0."DocEntry"
FROM ${dbCreds.CompanyDB}.OINV T0
WHERE T0."U_Unique" = ?`;
