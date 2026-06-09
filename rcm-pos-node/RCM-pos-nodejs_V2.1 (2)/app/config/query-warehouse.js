const { dbCreds } = require("./hana-db");

/**
 * OWHS - Warehouse Master table
 * OBIN - Bin Master table
 * OLCT - Location Master table
 * OBPL - Branch Master
 */
// NOT USED Anywhere
exports.warehouseQuery = `SELECT T0."WhsCode", T0."WhsName", T1."BinCode", T1."AbsEntry" "BinAbsEntry",
    T0."Location" "LocationCode", T2."Location" "LocationName"
  FROM ${dbCreds.CompanyDB}.OWHS T0
    LEFT OUTER JOIN ${dbCreds.CompanyDB}.OBIN T1 ON T0."DftBinAbs" = T1."AbsEntry"
    INNER JOIN ${dbCreds.CompanyDB}.OLCT T2 ON T0."Location" = T2."Code"
    INNER JOIN ${dbCreds.CompanyDB}.OBPL T3 ON T0."BPLid" = T3."BPLId"
  WHERE T0."Inactive" ='N'
    AND T0."BPLid" = ?
    ORDER BY T0."WhsCode"`;
// AND T0."U_portal"='Yes'
