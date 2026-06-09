const { dbCreds } = require("./hana-db");

/**
 * OLCT - Location master table
 */
exports.selectLocations = `SELECT T0."Code", T0."Location" FROM ${dbCreds.CompanyDB}.OLCT T0`;

/** Get Card AccountCodes, COD, OTC CardCode info for a given Location */
// `SELECT T0."Code" AS "Location", T0."Name" AS "AccountCode", T0."U_OTCCardCode", T0."U_CODCardCode"
exports.locationDefaults = `SELECT T0."Code" AS "Location", T0."U_AccountCode" AS "AccountCode", T0."U_OTCCardCode", T0."U_CODCardCode",
    T0."U_LocName", T0."U_LocAddress", T0."U_Store", T0."U_Phone", T0."U_Website", T0."U_Email", T1."U_Branch" AS "Branch"
    FROM ${dbCreds.CompanyDB}."@LOCACCOUNTMAPPING" T0
    INNER JOIN ${dbCreds.CompanyDB}."OLCT" T1 ON T0."Code" = T1."Location"
  WHERE UPPER(T0."Code") = UPPER(?)`;
