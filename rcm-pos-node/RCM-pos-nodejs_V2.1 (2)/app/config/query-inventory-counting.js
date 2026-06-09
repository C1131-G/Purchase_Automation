const { dbCreds } = require("./hana-db");

/**
 * Get Open InventoryCounting
 *
 * OINC   - Inventory Counting Header table
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
exports.inventoryCounting = `SELECT T0."DocNum", T0."DocEntry", T0."CountDate", T0."Time", T0."Status", T0."Remarks", T0."BPLId", T0."BPLName",
  T0."U_Location"
    FROM ${dbCreds.CompanyDB}.OINC T0
    JOIN ${dbCreds.CompanyDB}.INC8 T3 ON T0."DocEntry" = T3."DocEntry"
  WHERE T0."Status" = 'O'
  AND T3."CounterId" = ?`;

/**
 * Get Open Items Details for a given InventoryCounting
 * OINC   - Inventory Counting Header table
 * INC1   - Inventory Counting Row table
 * OBIN   - Bin Table
 */
exports.itemListForInventoryCounting = `SELECT T1."ItemCode", T1."ItemDesc", T1."LineNum", T1."WhsCode", T4."BinCode", T1."CountQty", 
    T1."CountDate", T1."CountTime",T2."TotalQty", 
    (SELECT STRING_AGG(F."BcdCode", ', ') FROM  ${dbCreds.CompanyDB}.OBCD F
        WHERE F."ItemCode" = ITM."ItemCode") AS "CodeBars",  
    (SELECT E."ItmsGrpNam" FROM  ${dbCreds.CompanyDB}.OITB E
        WHERE E."ItmsGrpCod" = ITM."ItmsGrpCod") AS "ItmsGrpName", 
    ITM."ItmsGrpCod"
  FROM ${dbCreds.CompanyDB}.OINC T0
    INNER JOIN ${dbCreds.CompanyDB}.INC1 T1 ON T0."DocEntry" = T1."DocEntry"
    INNER JOIN ${dbCreds.CompanyDB}.INC9 T2 ON T0."DocEntry" = T2."DocEntry" 
    INNER JOIN ${dbCreds.CompanyDB}.INC8 T3 ON T0."DocEntry" = T3."DocEntry"
    LEFT JOIN ${dbCreds.CompanyDB}.OBIN T4 ON T1."BinEntry" = T4."AbsEntry"
    INNER JOIN ${dbCreds.CompanyDB}.OITM ITM ON T1."ItemCode" = ITM."ItemCode"
  WHERE T1."LineNum" = T2."LineNum" 
    AND T2."CounterNum" = T3."CounterNum"
    AND T0."DocNum" = ?
    AND T3."CounterId" = ?`;
