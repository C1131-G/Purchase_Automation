const { dbCreds } = require("./hana-db");

/**
 * Get Customer info
 * OCRD = Customer master table
 *
 * U_Fin_Status - Financially Active ('Y') or Inactive ('N')
 */
const selectCustomerInfo = `SELECT T0."CardCode", T0."CardName", T0."Cellular", T0."U_OneTimeCustomer", T0."U_COD", T0."U_Fin_Status",
    T0."U_CustomerType",
    T0."CreditLine" as "CreditLimit", T0."CreditLine" - (T0."Balance" + T0."DNotesBal") as "AvailableBalance",
    T0."SlpCode" "SalesEmployeeCode", T0."LicTradNum"
  FROM ${dbCreds.CompanyDB}.OCRD T0
WHERE T0."CardType" ='C'`;

//T1."Block",
const selectCustomerAddress = `SELECT T0."CardCode", T1."AdresType", T1."Address", T1."Building", T1."Street",
  T1."City", T1."LicTradNum", T1."Block"
FROM ${dbCreds.CompanyDB}.OCRD T0
  INNER JOIN ${dbCreds.CompanyDB}.CRD1 T1 ON T0."CardCode" = T1."CardCode"
WHERE T1."AdresType" = 'S'
  AND T0."CardCode" = ?`;

const selectCustomerContactPerson = `SELECT T0."CardCode", T0."Name", T0."CntctCode" AS "ContactCode" FROM ${dbCreds.CompanyDB}.OCPR T0
  WHERE T0."CardCode" = ?`;

/**
 * OSPP - Special Prices
 * SPP1 - Special Prices - Data Areas.
 * T1."Price" Contains the Actual Special Price
 */
const selectCustomerSpecialPrice1 = `SELECT "Price", "FromDate", "ToDate"
  FROM ${dbCreds.CompanyDB}.SPP1
  WHERE "ItemCode" = ?
    AND "CardCode" = ?
    AND "FromDate" <= CURRENT_DATE
    AND IFNULL("ToDate", '2999-12-31') >= CURRENT_DATE
  LIMIT 1`;

const selectCustomerSpecialPrice2 = `SELECT B."Price", A."FromDate", A."ToDate"
  FROM ${dbCreds.CompanyDB}.SPP1 A
  INNER JOIN ${dbCreds.CompanyDB}."ITM1" B
    ON A."ItemCode" = B."ItemCode"
            AND A."ListNum" = B."PriceList"
  WHERE A."ItemCode" = ?
    AND A."CardCode" = '*1'
    AND A."FromDate" <= CURRENT_DATE
    AND IFNULL(A."ToDate", '2999-12-31') >= CURRENT_DATE
  LIMIT 1`;

const selectCustomerSpecialPrice3 = `SELECT T2."Price", CURRENT_DATE as "FromDate", CURRENT_DATE as "ToDate"
  FROM ${dbCreds.CompanyDB}."OWHS" T0
    INNER JOIN ${dbCreds.CompanyDB}."OBPL" T1
      ON T0."BPLid" = T1."BPLId"
    INNER JOIN ${dbCreds.CompanyDB}."ITM1" T2
      ON T1."U_PrcList" = T2."PriceList"
    WHERE T0."WhsCode" = ?
      AND T2."ItemCode" = ?
  LIMIT 1`;

const selectCustomerSpecialPriceNew = `SELECT "Price", "ItemCode", "CardCode", "WhsCode"
FROM (
    SELECT S1."Price", S1."ItemCode", S1."CardCode", 'S101' AS "WhsCode", 1 AS "Priority"
    FROM ${dbCreds.CompanyDB}."SPP1" S1
    WHERE S1."FromDate" <= CURRENT_DATE AND IFNULL(S1."ToDate", '2999-12-31') >= CURRENT_DATE
    
    UNION ALL
    
    SELECT B."Price", A."ItemCode", 'C4290' AS "CardCode", 'S101' AS "WhsCode", 2 AS "Priority"
    FROM ${dbCreds.CompanyDB}."SPP1" A
    INNER JOIN ${dbCreds.CompanyDB}."ITM1" B ON A."ItemCode" = B."ItemCode" AND A."ListNum" = B."PriceList"
    WHERE A."CardCode" = '*1' AND A."FromDate" <= CURRENT_DATE AND IFNULL(A."ToDate", '2999-12-31') >= CURRENT_DATE
    
    UNION ALL
    
    SELECT T2."Price", T2."ItemCode", 'C4290' AS "CardCode", T0."WhsCode", 3 AS "Priority"
    FROM ${dbCreds.CompanyDB}."OWHS" T0
    INNER JOIN ${dbCreds.CompanyDB}."OBPL" T1 ON T0."BPLid" = T1."BPLId"
    INNER JOIN ${dbCreds.CompanyDB}."ITM1" T2 ON T1."U_PrcList" = T2."PriceList"
    
    UNION ALL
    
    SELECT "Price", "ItemCode", 'C4290' AS "CardCode", 'S101' AS "WhsCode", 4 AS "Priority"
    FROM ${dbCreds.CompanyDB}."ITM1"
    WHERE "PriceList" = 1
)
WHERE "ItemCode" = ? 
  AND "CardCode" = ?
  AND "WhsCode" = ?
ORDER BY "Priority" ASC
LIMIT 1`;

module.exports = {
  selectCustomerInfo,
  selectCustomerAddress,
  selectCustomerContactPerson,
  selectCustomerSpecialPrice1,
  selectCustomerSpecialPrice2,
  selectCustomerSpecialPrice3,
  selectCustomerSpecialPriceNew,
};
