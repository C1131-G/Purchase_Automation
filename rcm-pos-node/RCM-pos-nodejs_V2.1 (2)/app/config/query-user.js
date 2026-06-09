const { dbCreds } = require("./hana-db");

/**
 * OUSR - Users Table
 * OUDG - User Defaults Table
 */
exports.selectSalesEmployeeForUser = `SELECT T0."USER_CODE", T1."SalePerson" "SlpCode"
  FROM ${dbCreds.CompanyDB}.OUSR T0, ${dbCreds.CompanyDB}.OUDG T1
WHERE T0."DfltsGroup" = T1."Code"
  AND T0."INTERNAL_K" = ?`;
