const { dbCreds } = require("./hana-db");

/**
 * Get Tim yard items info
 * OBTN = Customer master table
 *
 */

const selectTimYardItemInfo = `SELECT T0."ItemCode", T0."DistNumber" As "U_Batch", T0."U_Width" As "U_Width", T0."U_Height" As "U_Height", 
    T0."U_Length" As "U_Length", 0 AS "U_NoOfPcs",
    (IFNULL(T1."Quantity",0)-IFNULL(T1."CommitQty",0)) AS "U_AvlQty",
    0 AS "U_SelQty",
   (IFNULL(T1."Quantity", 0) - IFNULL(T1."CommitQty", 0)) / 
    ((T0."U_Height" / 1000) * (T0."U_Width" / 1000) * T0."U_Length") AS "U_AvlPcs",
    0 AS "U_BalPcs",
    0 AS "U_BalAvlQty"
  FROM ${dbCreds.CompanyDB}.OBTN T0
    INNER JOIN ${dbCreds.CompanyDB}.OBTQ T1 ON T0."SysNumber" = T1."SysNumber" AND T0."ItemCode" = T1."ItemCode"
  WHERE 1=1`;

const selectTimYardItemInitialInfo1 = `SELECT DISTINCT T0."ItemCode", T0."DistNumber" AS "U_Batch", T0."U_Width" As "U_Width", 
      T0."U_Height" As "U_Height", 
      T0."U_Length" As "U_Length", 
      0 AS "U_NoOfPcs",
      (IFNULL(T1."Quantity",0)-IFNULL(T1."CommitQty",0)) AS "U_AvlQty",
      0 AS "U_SelQty",
      (IFNULL(T1."Quantity", 0) - IFNULL(T1."CommitQty", 0)) / 
        ((T0."U_Height" / 1000) * (T0."U_Width" / 1000) * T0."U_Length") AS "U_AvlPcs",
      0 AS "U_BalPcs",
      0 AS "U_BalAvlQty"
    FROM ${dbCreds.CompanyDB}.OBTN T0
      LEFT JOIN ${dbCreds.CompanyDB}.OBTQ T1 ON T0."SysNumber" = T1."SysNumber" AND T0."ItemCode" = T1."ItemCode"
    WHERE 1=1`;

const selectTimYardItemInitialInfo2 = `SELECT DISTINCT T0."ItemCode", '' AS "U_Batch", T0."U_Width" As "U_Width", 
      T0."U_Height" As "U_Height", 
      T0."U_Length" As "U_Length", 
      0 AS "U_NoOfPcs",
      (IFNULL(T1."Quantity",0)-IFNULL(T1."CommitQty",0)) AS "U_AvlQty",
      0 AS "U_SelQty",
      (IFNULL(T1."Quantity", 0) - IFNULL(T1."CommitQty", 0)) / 
        ((T0."U_Height" / 1000) * (T0."U_Width" / 1000) * T0."U_Length") AS "U_AvlPcs",
      0 AS "U_BalPcs",
      0 AS "U_BalAvlQty"
    FROM ${dbCreds.CompanyDB}.OBTN T0
      LEFT JOIN ${dbCreds.CompanyDB}.OBTQ T1 ON T0."SysNumber" = T1."SysNumber" AND T0."ItemCode" = T1."ItemCode"
    WHERE 1=1`;

const selectTimyardItemInitialInfo3 = `SELECT T0."ItemCode",
        T0."DistNumber" AS "U_Batch",
        T0."U_Width",
        T0."U_Height",
        T0."U_Length",
        0 AS "U_NoOfPcs",
        (IFNULL(T1."Quantity",0)-IFNULL(T1."CommitQty",0)) AS "U_AvlQty",
        0 AS "U_SelQty",
        ROUND((IFNULL(T1."Quantity",0)-IFNULL(T1."CommitQty",0)) / 
          ((T0."U_Height"/1000) * (T0."U_Width"/1000) * T0."U_Length"),5) AS "U_AvlPcs",
        0 AS "U_BalPcs",
        0 AS "U_BalAvlQty"
      FROM ${dbCreds.CompanyDB}."OBTN" T0
      LEFT JOIN ${dbCreds.CompanyDB}."OBTQ" T1
        ON T0."SysNumber"=T1."SysNumber" AND T0."ItemCode"=T1."ItemCode"
      WHERE 1=1`;

const selectTimyardItemInitialInfo4 = `SELECT DISTINCT T0."ItemCode",
       '' AS "U_Batch",
       T0."U_Width",
       T0."U_Height",
       T0."U_Length",
       0 AS "U_NoOfPcs",
       0 AS "U_AvlQty",
       0 AS "U_SelQty",
       0 AS "U_AvlPcs",
       0 AS "U_BalPcs",
       0 AS "U_BalAvlQty"
    FROM ${dbCreds.CompanyDB}."OBTN" T0
    LEFT JOIN ${dbCreds.CompanyDB}."OBTQ" T1
      ON T0."SysNumber"=T1."SysNumber" AND T0."ItemCode"=T1."ItemCode"
    WHERE 1=1`;

const selectTimYardItemExistsCheck = `SELECT 1
      FROM ${dbCreds.CompanyDB}."OBTN" S0
    INNER JOIN ${dbCreds.CompanyDB}."OBTQ" S1
      ON S0."SysNumber"=S1."SysNumber" AND S0."ItemCode"=S1."ItemCode"
      WHERE S0."U_Width"  = T0."U_Width"
        AND S0."U_Height" = T0."U_Height"
        AND S0."U_Length" = T0."U_Length"`;

module.exports = {
  selectTimYardItemInfo,
  selectTimYardItemInitialInfo1,
  selectTimYardItemInitialInfo2,
  selectTimyardItemInitialInfo3,
  selectTimyardItemInitialInfo4,
  selectTimYardItemExistsCheck,
};
