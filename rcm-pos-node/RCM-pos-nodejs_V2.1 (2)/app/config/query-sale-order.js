const { dbCreds } = require("./hana-db");
const { draftObjectCodes } = require("../config/config");

/**
 * Get Open Sale Orders
 * 
 * ORDR - Header table for Sale Order
 * 
 **Fields Description
 * DocCur     - Currency
 * DocRate    - Exchange Rate
 * DocTotal   - Total Payment Due (after reducing Disc. & adding Tax)
 * DiscPrcnt  - Discount%
 * DiscSum    - Tot. disc. for Local Curr
 * DiscSumFC  - Tot. disc. for Foreign Curr.
 * 
 * T0."DocStatus"='O'
    AND T1."LineStatus" ='O'
    AND T0."BPLId" = ?
    ORDER BY T0."DocNum"
*/

exports.saleOrderQuery = `SELECT DISTINCT T0."BPLId", T0."DocEntry", T0."DocDate", T0."DocTime", T0."DocNum", T0."DocType", 
    T0."CardCode", T0."CardName",
    T0."Comments", T0."DocStatus", T0."DocCur", T0."DocRate", T0."DocTotal", T0."DocTotalFC",
    T0."DiscPrcnt" "DiscountPercent", T0."DiscSum" "TotalDiscount", T0."DiscSumFC" "TotalDiscountFC"
      FROM ${dbCreds.CompanyDB}.ORDR T0, ${dbCreds.CompanyDB}.RDR1 T1
    WHERE T0."DocType" = 'I'
      AND T0."DocEntry" = T1."DocEntry"`;

/**
 * Get Items Details for a given Sale Order(s)
 * ORDR - Header table for Sale Order
 * RDR1 - Row table for Sale Order
 * OITM - Item Master Table
 *
 **Fields Description
 * DocRate    - Exchange Rate
 * PriceBefDi - Unite Price
 */
//, T1."U_ReservedFor"
// T1."LineStatus" = 'O' AND

exports.itemListForSaleOrder = `SELECT T0."DocNum", T0."DocEntry",
    T1."LineNum", T1."ItemCode", ITM."ItemName", T1."LineStatus", T1."PriceBefDi" "UnitPrice",
    T1."OpenCreQty" as "Quantity", T1."OpenQty", T1."WhsCode", T1."unitMsr" "UomCode",
    ITM."ManBtchNum", ITM."ManSerNum",
    T1."VatPrcnt" "TaxPercent", T1."VatSum" "TaxLocal", T1."VatSumFrgn" "TaxForeign",
    T1."Project"
  FROM ${dbCreds.CompanyDB}.ORDR T0
    INNER JOIN ${dbCreds.CompanyDB}.RDR1 T1 ON T0."DocEntry" = T1."DocEntry"
    INNER JOIN ${dbCreds.CompanyDB}.OITM ITM ON T1."ItemCode" = ITM."ItemCode"
  WHERE T0."DocNum" IN `;

/**
 * Freight info for a given PO
 *
 * ORDR - Header table for Purchase Order
 * RDR3 - Row table for Purchase Order with Freight
 */
exports.freightInfo = `SELECT T0."DocNum", T0."DocEntry", T1."LineNum", T1."ExpnsCode" as "FreightCode",
  F."ExpnsName" "FreightName", (T1."LineTotal"-T1."PaidSys") "FreightAmount",
  (T1."TotalFrgn"-T1."PaidFC") as "FreightAmountFC"
    FROM ${dbCreds.CompanyDB}."ORDR" T0, ${dbCreds.CompanyDB}."RDR3" T1, ${dbCreds.CompanyDB}.OEXD F
  WHERE T0."DocEntry" = T1."DocEntry"
    AND T1."ExpnsCode" = F."ExpnsCode"
    AND T1."Status" = 'O'
    AND T0."DocNum" IN `;
