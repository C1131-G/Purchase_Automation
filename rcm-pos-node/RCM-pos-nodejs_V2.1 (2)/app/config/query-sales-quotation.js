const { dbCreds } = require("./hana-db");

/**
 * Get Open Sales Quotation
 *
 * OQUT - Header table for Sales Quotation
 *
 * T1."U_NAME" AS "Created By"
 *  OUSR T1
 * WHERE T0."UserSign" = T1."USERID"
 *
 * Added below dynamically based on user input
 * T0."DocStatus"='O'
 * AND T1."LineStatus" ='O'
 * ORDER BY T0."DocNum"
 */
exports.salesQuotationQuery = `SELECT DISTINCT T0."DocEntry", T0."DocDate", T0."DocTime", T0."DocNum", T0."DocDueDate",
    T0."CardCode", T0."CardName", T0."NumAtCard",
    T0."Comments", T0."DocStatus", T0."DocCur", T0."DocRate", T0."DocTotal", T0."DocTotalFC",
    T0."DiscPrcnt" "DiscountPercent", T0."DiscSum" "TotalDiscount", T0."DiscSumFC" "TotalDiscountFC",
    T0."VatSum", T0."VatPercent", T0."GroupNum" "PaymentTermCode", T0."SlpCode" "SalesPersonCode",
    T2."SlpName" "SalesPersonName",
    T0."Address2" "ShipTo", T0."U_CODEmail", T0."U_CODCntName", T0."U_CODTlePhone", T0."U_Location",
    T0."CntctCode" "ContactPersonCode"
      FROM ${dbCreds.CompanyDB}.OQUT T0, ${dbCreds.CompanyDB}.QUT1 T1, ${dbCreds.CompanyDB}.OSLP T2
    WHERE T0."DocType" = 'I'
      AND T0."DocEntry" = T1."DocEntry"
      AND T0."SlpCode" = T2."SlpCode"`;
//T0."U_CODAddress", T0."U_License", T0."U_FNPFNO", T0."U_TINNO", T0."U_VoterID"

/**
 * Get Open Items Details for a given Sales Quotation
 * OQUT - Header table for Sales Quotation
 * QUT1 - Row table for Sales Quotation
 * OITM - Item Master Table
 * 
    T1."PriceBefDi" "UnitPrice", T1."Project"
    T1."OpenCreQty" as "Quantity", T1."OpenQty", ITM."ManBtchNum", ITM."ManSerNum",
    
    T1."LineStatus" = 'O'
    AND 
 */
exports.itemListForSalesQuotation = `SELECT T0."DocNum", T0."DocEntry",
    T1."LineNum", T1."ItemCode", ITM."ItemName", T1."LineStatus", T1."FreeTxt" "FreeText",
    T1."Quantity", T1."OpenQty", T1."Price", T1."DiscPrcnt" "DiscountPercent", T1."unitMsr" "UomCode", T1."VatGroup",
    T1."WhsCode", T1."VatPrcnt" "TaxPercent", T1."VatSum" "TaxLocal", T1."VatSumFrgn" "TaxForeign",
    T1."LineTotal", T1."U_ReturnedQty", T1."U_RemainingOpenQty", T1."PriceBefDi" "PriceBeforDiscount",
    (SELECT E."ItmsGrpNam" FROM  ${dbCreds.CompanyDB}.OITB E
        WHERE E."ItmsGrpCod"=ITM."ItmsGrpCod") AS "ItmsGrpName", 
    ITM."ItmsGrpCod", ITM."ManSerNum", ITM."ManBtchNum",
    ITM."U_FCCC" AS "FCCCItem",
    CASE 
      WHEN EXISTS (
        SELECT 1 
          FROM ${dbCreds.CompanyDB}.SPP1 P WHERE P."ItemCode" = T1."ItemCode" 
            AND CURRENT_DATE >= P."FromDate" AND CURRENT_DATE <= P."ToDate" 
              AND (P."CardCode" = T0."CardCode" OR P."CardCode" = '*1')
      ) THEN 'Y'
      ELSE 'N'
      END AS "DiscApplied"
  FROM ${dbCreds.CompanyDB}.OQUT T0
    INNER JOIN ${dbCreds.CompanyDB}.QUT1 T1 ON T0."DocEntry" = T1."DocEntry"
    INNER JOIN ${dbCreds.CompanyDB}.OITM ITM ON T1."ItemCode" = ITM."ItemCode"
  WHERE T0."DocNum" IN `;

//(SELECT G."ListName" FROM  ${dbCreds.CompanyDB}.OPLN G
//WHERE G."ListNum" = O."U_PrcList") AS "PriceListName",

exports.updateSQSalesBatchSelectionDocNum = `UPDATE ${dbCreds.CompanyDB}.QUT1 T1 SET
    T1."U_DocNum" = ?
  WHERE T1."DocEntry" = ? AND T1."ItemCode" = ?`;

//This DIDN'T return all the items under a SQ, omitted a few, maybe bcoz of LEFT JOIN or additional tbls
//So using the old one
// exports.itemListForSalesQuotation =
// `SELECT T0."DocNum", T0."DocEntry", T1."LineNum", T1."ItemCode", T1."Dscription" "ItemName",
//   T1."Quantity", T1."Price", T1."DiscPrcnt", T1."TaxCode", D."ListName"
// FROM ${dbCreds.CompanyDB}.OQUT T0
//   LEFT JOIN ${dbCreds.CompanyDB}.QUT1 T1 ON T0."DocEntry" = T1."DocEntry"
//   LEFT JOIN ${dbCreds.CompanyDB}.ITM1 C ON T1."ItemCode" = C."ItemCode"
//   LEFT JOIN ${dbCreds.CompanyDB}.OPLN D ON C."PriceList" = D."ListNum"
// WHERE C."PriceList" = D."ListNum"
//   AND T1."PriceBefDi" = C."Price"
//   AND T1."LineStatus" = 'O'
//   AND T0."DocNum" IN `;
