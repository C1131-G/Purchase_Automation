const { dbCreds } = require("./hana-db");
const { draftObjectCodes } = require("../config/config");

/**
 * ODLN - Delivery Header table
 * DLN1 - Delivery Row table
 * NOTE: Add alias DocEntry for DocNum so that it will match the above Draft column name
 */
/**
 * Removd from the qry & added a separate (below) query for pulling Row level data
 T1."ItemCode", T1."Dscription" as "ItemName", T1."Quantity", T1."unitMsr", T1."OpenQty",
 T1."WhsCode", T1."FromWhsCod",

 , ${dbCreds.CompanyDB}.DLN1 T1

T0."DocEntry" = T1."DocEntry"
  AND 
 */
exports.selectApprovedDeliveries = `SELECT T0."DocNum", T0."DocStatus", T0."CANCELED", T0."ObjType", T0."DocDate", T0."DocTime", 
  T0."CardCode", T0."CardName", T0."NumAtCard", T0."DocTotal", T0."DocTotalFC", T0."Comments", T0."CreateDate",
  T0."U_OriginatorId", T0."U_ApproverId", T0."U_DraftStatus", TOR."U_NAME" as "Originator",
  T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T0."U_DraftDocEntry",
  T0."DocCur", T0."DiscPrcnt" "DiscountPercent", T0."DiscSum" "TotalDiscount", T0."DiscSumFC" "TotalDiscountFC",
  T0."BPLName"
     FROM ${dbCreds.CompanyDB}.ODLN T0, ${dbCreds.CompanyDB}.OUSR TOR
   WHERE T0."U_OriginatorId" = TOR."INTERNAL_K"
     AND T0."U_DraftStatus" = 'AUTO_APPROVED'`;

/**
 * Get Row level info (Item details) for given Delivery DocNums
 */
exports.selectItemDetails = `SELECT T1."LineNum", T1."LineStatus", T0."DocNum", T1."DocEntry", T1."ItemCode", T1."Dscription" as "ItemName", T1."Quantity", T1."unitMsr" AS "InvntryUom",
    T1."WhsCode", T1."FromWhsCod" "FromWarehouse", T1."U_FromBinLoc", T1."U_ToBinLocation"
  FROM ${dbCreds.CompanyDB}.ODLN T0, ${dbCreds.CompanyDB}.DLN1 T1
    WHERE T0."DocEntry" = T1."DocEntry"
      AND T0."DocNum" IN `;

/**
 * Get TaxTotal for a Delivery
 * ODLN - Delivery Header table
 * DLN4 - Delivery Tax info table
 */
exports.selectTaxTotal = `SELECT T0."DocEntry", T0."DocNum", T1."TaxSum", T1."TaxSumFrgn", T1."TaxSumSys"
    FROM ${dbCreds.CompanyDB}.ODLN T0
  LEFT JOIN ${dbCreds.CompanyDB}.DLN4 T1 ON T0."DocEntry" = T1."DocEntry"
    WHERE T0."DocNum" = ?`;

/**
 * Customer Ref# from Delivery.
 * ODLN - Header table for Delivery
 */
exports.selectDeliveryWithCustomerRefNoQuery = `SELECT DISTINCT T0."NumAtCard" as "CustomerRefNo"
  FROM ${dbCreds.CompanyDB}.ODLN T0
WHERE T0."NumAtCard" IS NOT NULL
  AND T0."CANCELED" NOT IN ('Y','C')
  AND T0."NumAtCard" = ?`;
