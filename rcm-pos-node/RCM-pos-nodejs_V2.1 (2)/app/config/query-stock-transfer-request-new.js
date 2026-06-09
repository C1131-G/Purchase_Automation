const { dbCreds } = require("./hana-db.js");

/**
 * Get Open Stock Transfer Requests
 *
 * OWTQ - STR Header table
 *
 */
exports.stockTransferRequest = `SELECT T0."DocNum", T0."DocNum" as "DocEntry", T0."DocEntry" as "ActualDocEntry", T0."DocDate", T0."Comments",
    T0."U_DraftStatus", T0."U_OriginatorId", T1."U_NAME" as "Originator", T0."Filler" "FromWarehouse",
    T0."ToWhsCode", T0."U_ToBinLocation", T0."BPLName", T0."SlpCode" "SalesPersonCode", T0."U_Location"
      FROM ${dbCreds.CompanyDB}.OWTQ T0, ${dbCreds.CompanyDB}.OUSR T1
    WHERE T0."UserSign" = T1."USERID"`;

/**
 * Get Items Details for a given STR DocEntry
 * WTQ1 - Row table for ST
 *
 * // To get recs. based on DocEntry - OLD method
 *  AND T1."DocEntry" IN
 */
exports.itemListForSTR = `SELECT T1."DocEntry", T1."LineNum", T1."ItemCode", T1."Dscription" as "ItemName", T1."Quantity",
    T1."unitMsr" AS "InvntryUom", T1."WhsCode", T1."FromWhsCod" "FromWarehouse", T1."U_ToBinLocation",
    T1."U_FromBinLoc"
  FROM ${dbCreds.CompanyDB}.WTQ1 T1, ${dbCreds.CompanyDB}.OWTQ T0
    WHERE T0."DocEntry" = T1."DocEntry"
      AND T0."DocNum" IN `;
