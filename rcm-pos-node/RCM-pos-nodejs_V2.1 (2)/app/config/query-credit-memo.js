const { dbCreds } = require("./hana-db");

/**
 * Get Open Credit Memo
 * 
 * ORIN - Header table for Credit Memo
 * 
 * T1."U_NAME" AS "Created By"
 *  OUSR T1
 * WHERE T0."UserSign" = T1."USERID"
 * 
 * AND T0."DocStatus"='O'
   AND T1."LineStatus" ='O'
*/
exports.creditMemoQuery = `SELECT DISTINCT T0."DocEntry", T0."DocDate", T0."DocTime", T0."DocNum", T0."CardCode", T0."CardName",
    T0."Comments", T0."DocStatus", T0."DocCur", T0."DocRate", T0."DocTotal", T0."DocTotalFC",
    T0."DiscPrcnt" "DiscountPercent", T0."DiscSum" "TotalDiscount", T0."DiscSumFC" "TotalDiscountFC",
    T0."U_Location", T0."SlpCode" "SalesPersonCode", T2."SlpName" "SalesPersonName"
      FROM ${dbCreds.CompanyDB}.ORIN T0, ${dbCreds.CompanyDB}.RIN1 T1, ${dbCreds.CompanyDB}.OSLP T2
    WHERE T0."DocType"='I'
      AND T0."DocEntry" = T1."DocEntry"
      AND T0."SlpCode" = T2."SlpCode"`;

/**
 * Get Open Items Details for a given Credit Memo
 * ORIN - Header table for Credit Memo
 * RIN1 - Row table for Credit Memo
 * OITM - Item Master Table
 * 
    T1."PriceBefDi" "UnitPrice", T1."Project"
    T1."OpenCreQty" as "Quantity", T1."OpenQty", ITM."ManBtchNum", ITM."ManSerNum",

    T1."LineStatus" = 'O'
    AND 
 */
exports.itemListForCreditMemo = `SELECT T0."DocNum", T0."DocEntry",
    T1."LineNum", T1."ItemCode", ITM."ItemName", T1."LineStatus", 
    T1."Quantity", T1."Price", T1."WhsCode", T1."unitMsr" "UomCode",
    T1."VatPrcnt" "TaxPercent", T1."VatSum" "TaxLocal", T1."VatSumFrgn" "TaxForeign",
    T1."LineTotal"
  FROM ${dbCreds.CompanyDB}.ORIN T0
    INNER JOIN ${dbCreds.CompanyDB}.RIN1 T1 ON T0."DocEntry" = T1."DocEntry"
    INNER JOIN ${dbCreds.CompanyDB}.OITM ITM ON T1."ItemCode" = ITM."ItemCode"
  WHERE T0."DocNum" IN `;
