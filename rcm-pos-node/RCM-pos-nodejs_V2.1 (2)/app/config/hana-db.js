//hana-db.2 _b4 APPROVALSTATUS.U_State.js

const { draftObjectCodes, draftStatus, recordState } = require("../config/config");

//Dev - Credentials for Service Layer
// const dbCreds = {
//   CompanyDB: "TEST_ROLL",
// 	UserName: "manager",
// 	Password: "abc@123"
// };

const serviceLayerSessionMaxAge = 30; //in minutes

//UAT - Credentials for Service Layer
const dbCreds = {
  CompanyDB: process.env.SERVICE_LAYER_COMPANYDB,
  UserName: process.env.SERVICE_LAYER_USERNAME,
  Password: process.env.SERVICE_LAYER_PASSWORD,
};

const dbConfig = {
  //serverNode: "your host:your port",
  host: process.env.HANA_HOST,
  port: process.env.HANA_PORT,
  user: process.env.HANA_USER,
  password: process.env.HANA_PASSWORD,
  // pooling: process.env.HANA_POOLING, //rvin
  pooling: false,
  maxPoolSize: process.env.HANA_MAX_POOL_SIZE,
  connectionLifetime: process.env.HANA_CONNECTION_LIFE_TIME, //max time in secs, that the connection is cached in the pool
};

/** Queries */
//Validate user login
const validateUserLogin = `SELECT T0."INTERNAL_K" as "InternalKey", T0."USER_CODE" as "UserCode", T0."U_NAME" as "UserName",
    T0."PortNum" as "MobileNo", T0."E_Mail", T0."Fax", T0."U_PortalBadLoginCount", T0."U_PortalAccountLocked",
    T0."U_TempPasswordFlag", T0."U_PortalUser", T0."U_PortalPassword" as "Password", T0."SalesDisc"
  FROM ${dbCreds.CompanyDB}.OUSR T0
  WHERE UPPER(T0."USER_CODE") = UPPER(?)`;
//AND T0."U_PortalUser" = 'Y'
//AND T0."U_PortalPassword" = ?`;

const validateUserEmail = `SELECT T0."INTERNAL_K" as "InternalKey", T0."U_PortalAccountLocked"
  FROM ${dbCreds.CompanyDB}.OUSR T0
WHERE T0."U_PortalUser" = 'Y'
  AND UPPER(T0."USER_CODE") = UPPER(?)
  AND UPPER(T0."E_Mail") = UPPER(?)`;

//Get the UserName for given ID
const selectUserInfo = `SELECT T0."U_NAME" as "UserName", T0."E_Mail" "Email" FROM ${dbCreds.CompanyDB}.OUSR T0
  WHERE T0."INTERNAL_K" = ?`;

//Select users based on UserGroup
const selectUsersInUserGroup = `SELECT DISTINCT T0."INTERNAL_K" "U_UserId", T0."U_NAME" as "UserName"
  FROM ${dbCreds.CompanyDB}.OUSR T0, ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T1,
    ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" T2, ${dbCreds.CompanyDB}."@PORTALMODULES" T3
  WHERE T0."U_PortalGroupId" = T1."U_GroupId"
    AND T1."U_GroupId" = T2."U_GroupId"
    AND T2."U_ModuleId" = T3."U_ModuleId"
    AND  T1."U_GroupName" LIKE `;

//Select UserGroup based on users
const selectUserGroupInUser = `SELECT DISTINCT T1."U_GroupName", T1."U_GroupId"
  FROM ${dbCreds.CompanyDB}.OUSR T0, ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T1
  WHERE T0."U_PortalGroupId" = T1."U_GroupId"
    AND T0."INTERNAL_K" = ?`;

//Get a user's Permissions for each Module - to restrict users from viewing/editing stuffs in UI
const getUserPermissionsForAllModules = `SELECT T3."U_ModuleName", T2."U_AllowRead", T2."U_AllowWrite", T2."U_AllowCancel", T2."U_AllowCreate"
  FROM ${dbCreds.CompanyDB}.OUSR T0, ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T1,
    ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" T2, ${dbCreds.CompanyDB}."@PORTALMODULES" T3
  WHERE T0."U_PortalGroupId" = T1."U_GroupId"
    AND T1."U_GroupId" = T2."U_GroupId"
    AND T2."U_ModuleId" = T3."U_ModuleId"
    AND T0."INTERNAL_K" = ?
  ORDER BY T3."U_ModuleName" ASC`;

//query to authorize user based on their permission - used by API
const checkUserPermission = `SELECT T2."U_AllowRead", T2."U_AllowWrite", T2."U_AllowCancel", T2."U_AllowCreate"
  FROM ${dbCreds.CompanyDB}.OUSR T0, ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T1,
    ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" T2, ${dbCreds.CompanyDB}."@PORTALMODULES" T3
  WHERE T0."U_PortalGroupId" = T1."U_GroupId"
    AND T1."U_GroupId" = T2."U_GroupId"
    AND T2."U_ModuleId" = T3."U_ModuleId"
    AND T0."INTERNAL_K" = ?
    AND T3."U_ModuleName" IN `; //(?) DIDN'T Work

/**
 * Get ALL Freight Code & Names
 *
 * OEXD - Table that stores Freight Info
 * NOTE: Added static values to Freight & FreightFC, will be used as default values for each Freight
 */
const allFreightInfo = `SELECT F."ExpnsCode" "FreightCode", F."ExpnsName" "FreightName"
  FROM ${dbCreds.CompanyDB}.OEXD F`;
//, '0.0' "FreightAmount", '0.0' "FreightAmountFC"

/**
 * Freight info for a given PO
 *
 * OPOR - Header table for Purchase Order
 * POR3 - Row table for Purchase Order with Freight
 */
const freightInfoForPO = `SELECT T0."DocNum", T0."DocEntry", T1."LineNum", T1."ExpnsCode" as "FreightCode",
  F."ExpnsName" "FreightName", (T1."LineTotal"-T1."PaidSys") "FreightAmount",
  (T1."TotalFrgn"-T1."PaidFC") as "FreightAmountFC"
    FROM ${dbCreds.CompanyDB}."OPOR" T0, ${dbCreds.CompanyDB}."POR3" T1, ${dbCreds.CompanyDB}.OEXD F
  WHERE T0."DocEntry" = T1."DocEntry"
    AND T1."ExpnsCode" = F."ExpnsCode"
    AND T1."Status" = 'O'
    AND T0."DocNum" IN `;
/*
const freightInfoForPO = 
  `SELECT T0."DocNum", T0."DocEntry", T1."LineNum", T1."ExpnsCode" as "FreightCode",
  F."ExpnsName" "FreightName", T1."LineTotal" "FreightAmount", T1."TotalFrgn" as "FreightAmountFC",
  T1."PaidSys", T1."PaidFC"
    FROM ${dbCreds.CompanyDB}."OPOR" T0, ${dbCreds.CompanyDB}."POR3" T1, ${dbCreds.CompanyDB}.OEXD F
  WHERE T0."DocEntry" = T1."DocEntry"
    AND T1."ExpnsCode" = F."ExpnsCode"
    AND T1."Status" = 'O'
    AND T0."DocNum" IN `;
  */
/* v1 - with OEXD joined, so this query returned NOTHING when a PO dont have Freight details.
  But I need the Freight Names & Codes with Amount marked as "0" for those POs as well
const freightInfoForPO = 
  `SELECT T2."ExpnsCode" as "FreightCode", T2."ExpnsName" "FreightName", T1."LineTotal" "FreightAmount",
  T1."TotalFrgn" as "FreightAmountFC"
    FROM ${dbCreds.CompanyDB}."OPOR" T0, ${dbCreds.CompanyDB}."POR3" T1, ${dbCreds.CompanyDB}."OEXD" T2
  WHERE T0."DocEntry" = T1."DocEntry"
    AND T1."ExpnsCode" = T2."ExpnsCode"
    AND T0."DocNum" = ?`; */

/**
 * OBPL - Branch Master
 */
const branch = `SELECT T1."BPLId", T1."BPLName" FROM ${dbCreds.CompanyDB}.OBPL T1`;

/**
 * Get the Branches assigned to a given User
 * OUSR - User Table
 * OBPL - Branch Master
 * USR6 - Table that has Users' Branch details
 */
const userBranches =
  //`SELECT T1."BPLId", T1."BPLName" FROM ${dbCreds.CompanyDB}.OBPL T1`;
  `SELECT T1."BPLId", T2."BPLName", T1."AcsDsbldBP"
    FROM ${dbCreds.CompanyDB}.OUSR T0, ${dbCreds.CompanyDB}.USR6 T1, ${dbCreds.CompanyDB}.OBPL T2
  WHERE T0."USER_CODE" = T1."UserCode"
    AND T1."BPLId" = T2."BPLId"
    AND T2."Disabled" != 'Y'
    AND T0."INTERNAL_K" = ?`;

/** ZZZ NOT Used anymore */
const itemsList = `SELECT T0."ItemCode", T0."ItemName", T0."InvntryUom" FROM ${dbCreds.CompanyDB}.OITM T0
    WHERE `;

/* v1 const itemQuantityInWarehouse =
  `SELECT T0."ItemCode", T1."WhsCode", T0."OnHand" FROM ${dbCreds.CompanyDB}.OITM T0, ${dbCreds.CompanyDB}.OWHS T1
    WHERE T1."U_portal"='Yes'`;*/
//WHERE T0."ItemCode" = ?
//AND T1."WhsCode" = ?`;
/**
 * Get the Available Quanity for all the items that are present in the 'portal' Warehouses
 */
const itemQuantityInWarehouse = `SELECT 
  T0."ItemCode", 
  T0."WhsCode", 
  T0."OnHand", 
  T2."SalUnitMsr" AS "SalesUOM"
FROM 
  ${dbCreds.CompanyDB}.OITW T0
JOIN ${dbCreds.CompanyDB}.OWHS T1 ON T0."WhsCode" = T1."WhsCode"
JOIN ${dbCreds.CompanyDB}.OITM T2 ON T0."ItemCode" = T2."ItemCode"`;
// `SELECT T0."ItemCode", T0."WhsCode", T0."OnHand"
//   FROM ${dbCreds.CompanyDB}.OITW T0, ${dbCreds.CompanyDB}.OWHS T1, ${dbCreds.CompanyDB}.OITM T2
//   WHERE T0."WhsCode" = T1."WhsCode" AND T0."ItemCode" = T2."ItemCode"`;
// AND T1."U_portal"='Yes'`;

/**
 * Get the List of Bins & the Available Item Qty in each Bin for a given WH
 * OITM - Item Master table
 * OBIN - Bin Master table
 * OIBQ -
 *
 ** Note:
 *  NORMAL Item - ManBtchNum = 'N' & ManSerNum = 'N'
 *  LABOR Item  - InvntItem = 'N'
 */
//A."ItemName",
const binsAndItemQuantityInWarehouse = `SELECT A."ItemCode", A."ItemName", A."CodeBars", A."FrgnName", C."WhsCode", D."BinCode", D."AbsEntry" "BinAbsEntry", C."OnHandQty",
    A."ManBtchNum", A."ManSerNum", A."InvntItem",
    (SELECT MAX(B."Price") FROM  ${dbCreds.CompanyDB}.ITM1 B
      WHERE B."ItemCode"=A."ItemCode" AND B."PriceList"=?) AS "Price"
  FROM ${dbCreds.CompanyDB}.OITM A, ${dbCreds.CompanyDB}.OIBQ C, ${dbCreds.CompanyDB}.OBIN D
WHERE A."ItemCode"=C."ItemCode"
  AND D."AbsEntry"=C."BinAbs"
  AND C."OnHandQty">0`;

const binsAndItemQuantityInWarehouseWithPrice = `SELECT A."ItemCode", A."ItemName", F."BcdCode" as CodeBars, A."FrgnName", IFNULL(B."WhsCode", '') as "WhsCode", 
    IFNULL(D."BinCode", '') as "BinCode", IFNULL(D."AbsEntry", 0) as "BinAbsEntry",
    (SELECT E."ItmsGrpNam" FROM  ${dbCreds.CompanyDB}.OITB E
        WHERE E."ItmsGrpCod"=A."ItmsGrpCod") AS "ItmsGrpName", 
    A."ItmsGrpCod",
    IFNULL(C."OnHandQty", 0) as "OnHandQty", A."ManBtchNum", A."ManSerNum", A."InvntItem", O."ListNum" AS "PriceList",
    (SELECT G."ListName" FROM  ${dbCreds.CompanyDB}.OPLN G
        WHERE G."ListNum" = O."ListNum") AS "PriceListName",
      A."U_FCCC" AS "FCCCItem",
      A."SalUnitMsr" as "SalesUOM",
      (SELECT MAX(B."Price") FROM  ${dbCreds.CompanyDB}.ITM1 B
        WHERE B."ItemCode"=A."ItemCode" AND B."PriceList"= O."ListNum") AS "Price"
    FROM 
      ${dbCreds.CompanyDB}.OITM A
      LEFT JOIN ${dbCreds.CompanyDB}.OITW B on A."ItemCode"=B."ItemCode" 
      LEFT JOIN ${dbCreds.CompanyDB}.OIBQ C ON A."ItemCode"=C."ItemCode" and C."WhsCode"=B."WhsCode"   
      LEFT JOIN ${dbCreds.CompanyDB}.OBIN D ON D."AbsEntry" = C."BinAbs" 
      LEFT JOIN ${dbCreds.CompanyDB}.OCRD O ON O."CardCode" = ?
      LEFT JOIN ${dbCreds.CompanyDB}.OBCD F ON A."ItemCode" = F."ItemCode" 
  WHERE 
  1=1`;

const binsAndItemQuantityInWarehouseWithPriceList = `SELECT A."ItemCode", A."ItemName", F."BcdCode" as CodeBars, A."FrgnName", IFNULL(B."WhsCode", '') as "WhsCode", 
    IFNULL(D."BinCode", '') as "BinCode", IFNULL(D."AbsEntry", 0) as "BinAbsEntry",
    (SELECT E."ItmsGrpNam" FROM  ${dbCreds.CompanyDB}.OITB E
        WHERE E."ItmsGrpCod"=A."ItmsGrpCod") AS "ItmsGrpName", 
    A."ItmsGrpCod",
    IFNULL(C."OnHandQty", 0) as "OnHandQty", A."ManBtchNum", A."ManSerNum", A."InvntItem", O."U_PrcList" AS "PriceList",
    (SELECT G."ListName" FROM  ${dbCreds.CompanyDB}.OPLN G
        WHERE G."ListNum" = O."U_PrcList") AS "PriceListName",
    A."U_FCCC" AS "FCCCItem",
    A."SalUnitMsr" as "SalesUOM",
      (SELECT MAX(B."Price") FROM  ${dbCreds.CompanyDB}.ITM1 B
        WHERE B."ItemCode"=A."ItemCode" AND B."PriceList"= O."U_PrcList") AS "Price",
    CASE 
      WHEN EXISTS (
        SELECT 1 
          FROM ${dbCreds.CompanyDB}.SPP1 P 
          WHERE P."ItemCode" = A."ItemCode"
            AND CURRENT_DATE >= P."FromDate" AND CURRENT_DATE <= P."ToDate" 
            AND (P."CardCode"= ? OR P."CardCode" = '*1')) 
            THEN 'Y'
    ELSE 'N'
      END AS "DiscApplied"
    FROM 
      ${dbCreds.CompanyDB}.OITM A
      LEFT JOIN ${dbCreds.CompanyDB}.OITW B on A."ItemCode"=B."ItemCode" 
      LEFT JOIN ${dbCreds.CompanyDB}.OIBQ C ON A."ItemCode"=C."ItemCode" and C."WhsCode"=B."WhsCode"   
      LEFT JOIN ${dbCreds.CompanyDB}.OBIN D ON D."AbsEntry" = C."BinAbs" 
      LEFT JOIN ${dbCreds.CompanyDB}.OBPL O ON O."BPLId" = ?
      LEFT JOIN ${dbCreds.CompanyDB}.OBCD F ON A."ItemCode" = F."ItemCode" 
  WHERE 
  1=1`;
//commenting this out to show Bins with '0' Available Qty too

/**
 * Get all Bins under a givne Warehouse
 */
const binsList = `SELECT T0."AbsEntry", T0."BinCode"
  FROM ${dbCreds.CompanyDB}."OBIN" T0`;
//WHERE T0."WhsCode" ='Z'`

const binsListForItem = `SELECT IFNULL(D."BinCode", '') as "BinCode", IFNULL(D."AbsEntry", 0) as "BinAbsEntry"
  FROM ${dbCreds.CompanyDB}.OBIN D
    LEFT JOIN ${dbCreds.CompanyDB}.OIBQ C ON D."AbsEntry" = C."BinAbs"
  WhERE C."WhsCode" = ? AND C."ItemCode" = ?`;

/**
 * Get the Item Details from scanned Serial No. or Batch No. This info is requried during Stock Transfer
 * --T0."ItemName",
 */
const selectInfoFromBatchSerialNo = `SELECT DISTINCT T0."ItemCode", T0."BatchNum", T0."IntrSerial", T2."WhsCode", T2."BinCode",
T2."AbsEntry" "BinAbsEntry", T0."Quantity", T0."InDate"
  FROM ${dbCreds.CompanyDB}."OIBT" T0, ${dbCreds.CompanyDB}."OIBQ" T1, ${dbCreds.CompanyDB}."OBIN" T2
WHERE T0."ItemCode"=T1."ItemCode" 
  AND T0."WhsCode"=T2."WhsCode"
  AND T1."BinAbs"=T2."AbsEntry"
  AND T0."Quantity" > 0
  AND T1."OnHandQty" > 0`;
// AND `;
/*
--v2. b4 Adding Bin Loc. to the query
`SELECT T0."ItemCode", T0."WhsCode", T0."Quantity", T0."BatchNum", T0."IntrSerial", T0."InDate"
  FROM ${dbCreds.CompanyDB}.OIBT T0
WHERE T0."Quantity" > 0
  AND `;*/
//T0."ItemCode" = ? AND T0."WhsCode" = ?
/*`SELECT T0."ItemCode", T0."WhsCode", T0."Quantity", T0."BatchNum", T0."IntrSerial", T0."BaseNum"
  FROM ${dbCreds.CompanyDB}.OIBT T0
WHERE T0."BatchNum" = ?
  OR T0."IntrSerial" = ?`;*/

/** Get all the Batch/Serial Items for a given ItemCode & Warehouse along with its Total Quantity
 * Used along with the next query in Create 'Issue For Prod.' screen
 * OBTN - Batch Items
 * OSRN - Serial No. Items
 * OBIN - Bin Details
 */
const batchForItemAndWH =
  /*`SELECT A."ItemCode",A."WhsCode",B."DistNumber" AS "BatchNumberProperty",A."OnHandQty"
FROM ${dbCreds.CompanyDB}.OBBQ A 
  INNER JOIN ${dbCreds.CompanyDB}.OBTN B ON B."AbsEntry"=A."SnBMDAbs" AND A."ItemCode"=B."ItemCode" 
  INNER JOIN ${dbCreds.CompanyDB}.OBIN C ON C."AbsEntry"=A."BinAbs" AND A."WhsCode"=C."WhsCode" 
WHERE A."OnHandQty">0`;*/
  //A."ItemCode"=? AND A."WhsCode"=?
  //,B."U_ReservedFor"

  `SELECT A."ItemCode",A."WhsCode", C."BinCode", C."AbsEntry", B."DistNumber" AS "BatchNumberProperty",SUM(A."OnHandQty") "OnHandQty"
FROM ${dbCreds.CompanyDB}.OBBQ A
  INNER JOIN ${dbCreds.CompanyDB}.OBTN B ON B."AbsEntry"=A."SnBMDAbs" AND A."ItemCode"=B."ItemCode"
  INNER JOIN ${dbCreds.CompanyDB}.OBIN C ON C."AbsEntry"=A."BinAbs"
WHERE A."OnHandQty">0`;

//,B."U_ReservedFor"
const serialForItemAndWH = `SELECT A."ItemCode",A."WhsCode", C."BinCode", C."AbsEntry", B."DistNumber" AS "InternalSerialNumber",SUM(A."OnHandQty") "OnHandQty"
FROM ${dbCreds.CompanyDB}.OSBQ A 
  INNER JOIN ${dbCreds.CompanyDB}.OSRN B ON B."AbsEntry"=A."SnBMDAbs" AND A."ItemCode"=B."ItemCode" 
  INNER JOIN ${dbCreds.CompanyDB}.OBIN C ON C."AbsEntry"=A."BinAbs"
WHERE A."OnHandQty">0`;
//INNER JOIN ${dbCreds.CompanyDB}.OBIN C ON C."AbsEntry"=A."BinAbs" AND A."WhsCode"=C."WhsCode"

/**
 * Get the Bin details & the available Qty for a given Batch or Serial num.
 * OBTN - Batch Items
 * OSRN - Serial No. Items
 * OBIN - Bin Details
 */
//,B."U_ReservedFor"
const getAllBinsForBatch = `SELECT A."ItemCode", B."itemName" AS "ItemName", A."WhsCode",B."DistNumber" AS "BatchNumberProperty",A."OnHandQty",C."BinCode",
  C."AbsEntry" "BinAbsEntry", D."Location" "LocationCode", E."Location" "LocationName", B."InDate"
FROM ${dbCreds.CompanyDB}.OBBQ A 
  INNER JOIN ${dbCreds.CompanyDB}.OBTN B ON B."AbsEntry"=A."SnBMDAbs" AND A."ItemCode"=B."ItemCode" 
  INNER JOIN ${dbCreds.CompanyDB}.OBIN C ON C."AbsEntry"=A."BinAbs" AND A."WhsCode"=C."WhsCode"
  INNER JOIN  ${dbCreds.CompanyDB}.OWHS D ON D."WhsCode"=A."WhsCode"
  INNER JOIN ${dbCreds.CompanyDB}.OLCT E ON D."Location"=E."Code"
WHERE A."OnHandQty">0`;

//,B."U_ReservedFor"
const getAllBinsForSerial = `SELECT A."ItemCode", B."itemName" AS "ItemName", A."WhsCode",B."DistNumber" AS "InternalSerialNumber",A."OnHandQty",C."BinCode",
  C."AbsEntry" "BinAbsEntry", D."Location" "LocationCode", E."Location" "LocationName", B."InDate"
FROM ${dbCreds.CompanyDB}.OSBQ A 
  INNER JOIN ${dbCreds.CompanyDB}.OSRN B ON B."AbsEntry"=A."SnBMDAbs" AND A."ItemCode"=B."ItemCode" 
  INNER JOIN ${dbCreds.CompanyDB}.OBIN C ON C."AbsEntry"=A."BinAbs" AND A."WhsCode"=C."WhsCode"
  INNER JOIN  ${dbCreds.CompanyDB}.OWHS D ON D."WhsCode"=A."WhsCode"
  INNER JOIN ${dbCreds.CompanyDB}.OLCT E ON D."Location"=E."Code"
WHERE A."OnHandQty">0`;
//A."ItemCode"=? AND A."WhsCode"=? AND B."DistNumber"=?

const vendorRefNoQuery =
  // `SELECT DISTINCT T0."NumAtCard" as "VendorRefNo" FROM ${dbCreds.CompanyDB}.OPDN T0
  //   WHERE T0."NumAtCard" IS NOT NULL
  // AND T0."NumAtCard"=`;
  `SELECT DISTINCT T0."NumAtCard" as "VendorRefNo"
    FROM ${dbCreds.CompanyDB}.OPDN T0
  WHERE T0."NumAtCard" IS NOT NULL
    AND T0."CANCELED" NOT IN ('Y','C')
    AND T0."NumAtCard"=`;

//this is for poppulating all Portal Users' info on User Details screen
const allUsers = `SELECT T0."INTERNAL_K" as "InternalKey", T0."USER_CODE" as "UserCode", T0."U_NAME" as "UserName",
    T0."PortNum" as "MobileNo", T0."E_Mail", T0."U_PortalGroupId", T1."U_GroupName", T0."U_PortalUser", 
    T0."U_PortalBadLoginCount", T0."U_PortalAccountLocked"
  FROM ${dbCreds.CompanyDB}.OUSR T0
    FULL OUTER JOIN ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T1
    ON T0."U_PortalGroupId" = T1."U_GroupId"
  WHERE T0."U_PortalUser" = ?
    AND T0."U_NAME" IS NOT NULL
  ORDER BY T0."U_PortalUser" DESC, T0."U_NAME" ASC`;
//T0."U_PortalPassword",
//T0."Locked"='N' AND
//  WHERE T0."U_PortalUser"='Y'

/** v1 - this Doesn't return User Groups that dont have an entry in PORTALPERMISSIONS table, but I
 * need them too.
const userGroupsWithPermissions = 
  //`SELECT T0."U_GroupId", T0."U_GroupName" FROM ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T0`;
  `SELECT T0."U_GroupId", T0."U_GroupName", T1."U_PermissionId", T1."U_ModuleId", T2."U_ModuleName", 
    T1."U_AllowRead", T1."U_AllowWrite", T1."U_AllowCancel", T1."U_AllowCreate"
  FROM ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T0 , ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" T1,
    ${dbCreds.CompanyDB}."@PORTALMODULES" T2
  WHERE T0."U_GroupId" = T1."U_GroupId"
    AND T1."U_ModuleId" = T2."U_ModuleId"`;
*/
/** v2 - this returns records with even BLANK User Group & Modules names
 * v4 - so added WHERE cond. to filter NULL GroupNames, but cant filter NULL ModuleNames.
 * Bcoz adding cond. to remove them will remove GroupNames that dont have Permissions, so let it be as is.
 * this will be taken care in the frontend */
const userGroupsWithPermissions = `SELECT T0."U_GroupId", T0."U_GroupName", T1."U_PermissionId", T1."U_ModuleId", T2."U_ModuleName", 
    T1."U_AllowRead", T1."U_AllowWrite", T1."U_AllowCancel", T1."U_AllowCreate"
  FROM ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T0
    FULL OUTER JOIN ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" T1 ON T0."U_GroupId" = T1."U_GroupId"
    FULL OUTER JOIN ${dbCreds.CompanyDB}."@PORTALMODULES" T2 ON T1."U_ModuleId" = T2."U_ModuleId"
  WHERE T0."U_GroupName" IS NOT NULL
    ORDER BY T2."U_ModuleName" ASC, T0."U_GroupName" ASC`;
/* v3 - this worked the same way as v1
const userGroupsWithPermissions = 
  //`SELECT T0."U_GroupId", T0."U_GroupName" FROM ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T0`;
  `SELECT T0."U_GroupId", T0."U_GroupName", T1."U_PermissionId", T1."U_ModuleId", T2."U_ModuleName", 
    T1."U_AllowRead", T1."U_AllowWrite", T1."U_AllowCancel", T1."U_AllowCreate"
  FROM ${dbCreds.CompanyDB}."@PORTALMODULES" T2, ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T0
    FULL OUTER JOIN ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" T1 ON T0."U_GroupId" = T1."U_GroupId"
  WHERE T0."U_GroupName" IS NOT NULL
    AND T1."U_ModuleId" = T2."U_ModuleId"`;
  //AND T2."U_ModuleName" IS NOT NULL`;
*/
/* v4 - this filtered NULL GroupNames but still returned NULL ModuleNames. So modified v2 to maek the query simple.
Anyway both the queries returns same records.
const userGroupsWithPermissions = 
  `SELECT "U_GroupId", "U_GroupName", "U_PermissionId", "U_ModuleId", "U_ModuleName", 
    "U_AllowRead", "U_AllowWrite", "U_AllowCancel", "U_AllowCreate"
  FROM 
    (SELECT T0."U_GroupId", T0."U_GroupName", T1."U_PermissionId", T1."U_ModuleId", T2."U_ModuleName", 
      T1."U_AllowRead", T1."U_AllowWrite", T1."U_AllowCancel", T1."U_AllowCreate"
    FROM ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T0
      FULL OUTER JOIN ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" T1 ON T0."U_GroupId" = T1."U_GroupId"
      FULL OUTER JOIN ${dbCreds.CompanyDB}."@PORTALMODULES" T2 ON T1."U_ModuleId" = T2."U_ModuleId")
  WHERE "U_GroupName" IS NOT NULL`;*/
//AND "U_ModuleName" IS NOT NULL`;

const userPermissionsForGivenGroup = `SELECT T0."U_PermissionId", T0."U_GroupId", T0."U_ModuleId", T1."U_ModuleName", T0."U_AllowRead", T0."U_AllowWrite", 
    T0."U_AllowCancel", T0."U_AllowCreate"
  FROM ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" T0, ${dbCreds.CompanyDB}."@PORTALMODULES" T1
  WHERE T0."U_ModuleId" = T1."U_ModuleId"
    AND T0."U_GroupId" = `;

const usersInGivenGroup = `SELECT T0."U_NAME" as "UserName", T0."U_PortalGroupId" FROM ${dbCreds.CompanyDB}.OUSR T0
    WHERE T0."U_PortalGroupId"=`;

const portalModules = `SELECT T0."U_ModuleId", T0."U_ModuleName" FROM ${dbCreds.CompanyDB}."@PORTALMODULES" T0
    ORDER BY T0."U_ModuleName"`;

const portalUserGroups = `SELECT T0."U_GroupId", T0."U_GroupName" FROM ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" T0
    ORDER BY T0."U_GroupName"`;

//this is for loading User dropdown in Approval Setup screen
const portalUsers = `SELECT T0."INTERNAL_K" as "U_UserId", T0."U_NAME" as "UserName"
    FROM ${dbCreds.CompanyDB}.OUSR T0
  WHERE T0."U_PortalUser"='Y'
    ORDER BY T0."U_NAME"`;

//INSERT
/** NOTE:
  #1 Without double quotes enclosing the column name it threw 'invalid column name: CODE'
  #2 Code & Name are mandatory fields, without them got this error,
    message: 'cannot insert NULL or update to NULL: Code'
*/
const insertUserGroup = `INSERT INTO ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" ("Code", "Name", "U_GroupName", "U_GroupId")
    VALUES (?, ?, ?, ?)`;

const insertPermissions = `INSERT INTO ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" ("Code", "Name", "U_GroupId", "U_ModuleId",
    "U_AllowRead", "U_AllowWrite", "U_AllowCancel", "U_AllowCreate", "U_PermissionId")
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const updateUserGroup = `UPDATE ${dbCreds.CompanyDB}."@PORTALUSERGROUPS"
    SET "Code"=?, "Name"=?, "U_GroupName"=?
  WHERE "U_GroupId"=?`;

const updatePortalPassword = `UPDATE ${dbCreds.CompanyDB}.OUSR
    SET "U_PortalPassword"=?, "U_TempPasswordFlag"=?
  WHERE "INTERNAL_K"=?`;

const updatePermissions = `UPDATE ${dbCreds.CompanyDB}."@PORTALPERMISSIONS"
    SET "Code"=?, "Name"=?, "U_GroupId"=?, "U_ModuleId"=?,
    "U_AllowRead"=?, "U_AllowWrite"=?, "U_AllowCancel"=?, "U_AllowCreate"=?
  WHERE "U_PermissionId"=?`;

const deleteUserGroup = `DELETE FROM ${dbCreds.CompanyDB}."@PORTALUSERGROUPS" WHERE "U_GroupId" = `;

const deletePermissions = `DELETE FROM ${dbCreds.CompanyDB}."@PORTALPERMISSIONS" WHERE "U_GroupId" = `;

//Approval Template
//using below individual tables instead of this JOINed query
/*const approvalSetup =
  `SELECT T0."DocEntry", T0."U_Name", T0."U_Description", T0."U_DocumentName", T0."U_Terms", 
  T0."U_NoOfApprovals", T0."U_Active", T1."U_UserId" "Originator_Id", T2."U_UserId" "Approver_Id"
    FROM ${dbCreds.CompanyDB}."@APPROVALHEADER" T0, ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" T1,
    ${dbCreds.CompanyDB}."@APPROVALAPPROVER" T2
  WHERE T0."DocEntry" = T1."DocEntry"
    AND T0."DocEntry" = T2."DocEntry"`;
*/

const selectApprovalHeader = `SELECT T0."DocEntry", T0."U_Name", T0."U_Description", T0."U_DocumentName", T0."U_Terms", 
    T0."U_NoOfApprovals", T0."U_MultiLevelApproval", T0."U_Active"
  FROM ${dbCreds.CompanyDB}."@APPROVALHEADER" T0`;
const selectApprovalOriginator = `SELECT T0."LineId", T0."DocEntry", T0."U_UserId" FROM ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" T0`;
const selectApprovalApprover = `SELECT T0."LineId", T0."DocEntry", T0."U_UserId", T0."U_ApprovalLevel"
    FROM ${dbCreds.CompanyDB}."@APPROVALAPPROVER" T0`;

//Get ALL DocEntries b4 running INSERT to create PrimaryKey for the tables
const allHeaderIds = `SELECT T0."DocEntry" FROM ${dbCreds.CompanyDB}."@APPROVALHEADER" T0
    ORDER BY T0."DocEntry" ASC`;
const allOriginatorIds = `SELECT T0."LineId" FROM ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" T0
    WHERE T0."DocEntry"=?
  ORDER BY T0."LineId" ASC`;
const allApproverIds = `SELECT T0."LineId" FROM ${dbCreds.CompanyDB}."@APPROVALAPPROVER" T0
    WHERE T0."DocEntry"=?
  ORDER BY T0."LineId" ASC`;

const insertApprovalHeader = `INSERT INTO ${dbCreds.CompanyDB}."@APPROVALHEADER" ("U_Name", "U_Description", "U_DocumentName", "U_Terms",
    "U_NoOfApprovals", "U_MultiLevelApproval", "U_Active", "DocEntry") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
const insertApprovalOriginator = `INSERT INTO ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" ("U_UserId", "DocEntry", "LineId") VALUES (?, ?, ?)`;
const insertApprovalApprover = `INSERT INTO ${dbCreds.CompanyDB}."@APPROVALAPPROVER" ("U_UserId", "U_ApprovalLevel", "DocEntry", "LineId") VALUES (?, ?, ?, ?)`;

const updateApprovalHeader = `UPDATE ${dbCreds.CompanyDB}."@APPROVALHEADER" SET "U_Name"=?, "U_Description"=?, "U_DocumentName"=?,
    "U_Terms"=?, "U_NoOfApprovals"=?, "U_MultiLevelApproval"=?, "U_Active"=? WHERE "DocEntry" = ?`;
const updateApprovalOriginator = `UPDATE ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" SET "U_UserId"=? WHERE "DocEntry"=? AND "LineId"=?`;
const updateApprovalApprover = `UPDATE ${dbCreds.CompanyDB}."@APPROVALAPPROVER" SET "U_UserId"=?, "U_ApprovalLevel"=? WHERE "DocEntry"=? AND "LineId"=?`;

const deleteApprovalTemplate1 = `DELETE FROM ${dbCreds.CompanyDB}."@APPROVALHEADER" WHERE "DocEntry"=?`;
const deleteApprovalTemplate2 = `DELETE FROM ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" WHERE "DocEntry" = ?`;
const deleteApprovalTemplate3 = `DELETE FROM ${dbCreds.CompanyDB}."@APPROVALAPPROVER" WHERE "DocEntry" = ?`;

const deleteApprovalOriginator = `DELETE FROM ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" WHERE "DocEntry"=? AND "LineId"=?`;
const deleteApprovalApprover = `DELETE FROM ${dbCreds.CompanyDB}."@APPROVALAPPROVER" WHERE "DocEntry"=? AND "LineId"=?`;

//Get Approver details of a given Originator for a given Module
const selectApproverForOriginator = `SELECT T0."U_MultiLevelApproval", T0."U_NoOfApprovals",
  T2."U_UserId" "ApproverId", T2."U_ApprovalLevel", T3."U_NAME" as "UserName", T3."E_Mail" "Email"
    FROM ${dbCreds.CompanyDB}."@APPROVALHEADER" T0, ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" T1,
    ${dbCreds.CompanyDB}."@APPROVALAPPROVER" T2, ${dbCreds.CompanyDB}.OUSR T3,
    ${dbCreds.CompanyDB}."@PORTALMODULES" T4
  WHERE T0."DocEntry" = T1."DocEntry"
    AND T0."DocEntry" = T2."DocEntry"
    AND T0."U_Active" = 'Y'
    AND T2."U_UserId" = T3."INTERNAL_K"
    AND T1."U_UserId" = ?
    AND T4."U_ModuleId" = T0."U_DocumentName"
    AND T4."U_ModuleName" = ?`;

/**
 * Get the Multi-Approver info for a given Draft
 * APPROVALSTATUS - Table to store the Multi-Approver approval statuses
 */
const selectDraftApproversList = `SELECT DISTINCT T0."U_ApprovalStatusId", T0."U_DocEntry", T0."U_ApproverId", TAP."U_NAME" as "Approver",
  T0."U_DraftStatus", T0."U_ApprovalLevel", T0."U_RejectedReason", T0."U_DateTime"
FROM ${dbCreds.CompanyDB}."@APPROVALSTATUS" T0, ${dbCreds.CompanyDB}.OUSR TAP
  WHERE T0."U_ApproverId" = TAP."INTERNAL_K"
AND T0."U_DocEntry" IN `;
//AND T0."U_DraftStatus" != 'NOT_ASSIGNED' --to hide unassigned Draft from ORiginator's screen
// (?)
//ORDER BY T0."U_DocEntry" ASC`;

/**
 * Get the rec. count based on Draft Status that is passed
 */
const selectDraftApprovalStatusCount = `SELECT COUNT(T0."U_ApprovalStatusId") as "Count"
  FROM ${dbCreds.CompanyDB}."@APPROVALSTATUS" T0, ${dbCreds.CompanyDB}.OUSR TAP
WHERE T0."U_ApproverId" = TAP."INTERNAL_K"
  AND T0."U_DocEntry" = ?
  AND T0."U_DraftStatus" = ?`;

/**
 * Get the details of the Approver for the givne Draft
 * APPROVALSTATUS - Table to store the Multi-Approver approval statuses
 */
// HH24:MI:SS.FF2
const selectDraftApprovalDate = `SELECT TO_CHAR(T0."U_DateTime", 'YYYY-MM-DD') "DocDate"
   FROM ${dbCreds.CompanyDB}."@APPROVALSTATUS" T0
 WHERE T0."U_DocEntry" = ?
   AND T0."U_ApprovalLevel" = ?`;

/**
 * Get Creation Date of a given Draft
 * ODRF - Drafts Header table
 */
//, T0."DocTime"
const selectDraftCreationDate = `SELECT T0."DocDate"
    FROM ${dbCreds.CompanyDB}.ODRF T0
  WHERE T0."DocEntry" = ?`;

/**
 * Set the status of the next approver in the Approval heirarchy for a given Draft
 * APPROVALSTATUS - Table to store the Multi-Approver approval statuses
 */
const updateDraftNextApprovalLevel = `UPDATE ${dbCreds.CompanyDB}."@APPROVALSTATUS"
  SET "U_DraftStatus" = ?
WHERE "U_DocEntry" = ?
  AND "U_ApprovalLevel" = ?`;

/**
 * Get the details of the Approver who is in the next Approval heirarchy for the givne Draft
 * APPROVALSTATUS - Table to store the Multi-Approver approval statuses
 */
const selectDraftNextApproverDetails = `SELECT TAP."U_NAME" as "Approver", TAP."E_Mail" "Email"
  FROM ${dbCreds.CompanyDB}."@APPROVALSTATUS" T0, ${dbCreds.CompanyDB}.OUSR TAP
WHERE T0."U_ApproverId" = TAP."INTERNAL_K"
  AND T0."U_DocEntry" = ?
  AND T0."U_ApprovalLevel" = ?`;

/**
 * Insert the Multi-Approver info for a Draft
 * APPROVALSTATUS - Table to store the Multi-Approver approval statuses
 */
const insertDraftApproversList = `INSERT INTO ${dbCreds.CompanyDB}."@APPROVALSTATUS" ("DocEntry", "U_ApprovalStatusId", "U_DocEntry", "U_DraftStatus",
  "U_ApproverId", "U_ApprovalLevel") VALUES (?, ?, ?, ?, ?, ?)`;

/**
 * Update status of Multi-Approver info for a Draft
 * APPROVALSTATUS - Table to store the Multi-Approver approval statuses
 */
const updateDraftApproversList = `UPDATE ${dbCreds.CompanyDB}."@APPROVALSTATUS" SET "U_DraftStatus" = ?, "U_RejectedReason" = ?,
  "U_DateTime" = TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS.FF2')
WHERE "U_ApprovalStatusId" = ?`;

/**
 * #1. In a NON Multi-level approval setup, when the No. of the Approvals required
 * for a draft is received, the statuses of the Approval records created for the
 * rest of the Approvers that are in PENDING or NOT_ASSIGNED status will be changed to GENERATED
 *
 * #2. Also, when one Approver 'rejects' the request, the statuses of the Approval recs.
 * created for other Approver's will be set as NOT_REQUIRED
 *
 * APPROVALSTATUS - Table to store the Multi-Approver approval statuses
 */
const updateApprovalStatus = `UPDATE ${dbCreds.CompanyDB}."@APPROVALSTATUS" SET "U_DraftStatus" = ?
    WHERE "U_DraftStatus" IN ('${draftStatus.PENDING}', '${draftStatus.NOT_ASSIGNED}')
  AND "U_DocEntry" = ?`;

/**
 * Update the 'state' of the existign ApprovalStatus rec. of Draft from ACTIVE to INACTIVE when
 * an Originator edit & RESUBMITs a Rejected Draft. After this a new set of ApprovalStatus recs. will
 * be created for that Draft
 */
const updateApprovalStatusRecState = `UPDATE ${dbCreds.CompanyDB}."@APPROVALSTATUS" SET "U_State" = ?
     WHERE "U_DocEntry" = ?`;

/** B4 storing Approval/Reject Time
 `UPDATE ${dbCreds.CompanyDB}."@APPROVALSTATUS" SET "U_DraftStatus" = ?, "U_RejectedReason" = ?
WHERE "U_ApprovalStatusId" = ?`;
  */

/**
 * Get No. of required Approval count for a given Draft
 * ODRF            - Drafts Header table
 * "ObjType" ='20' - GRPO Object Type
 */
const selectNoOfApprovalsForDraft = `SELECT T0."U_NoOfApprovals", T0."U_MultiLevelApproval"
    FROM ${dbCreds.CompanyDB}.ODRF T0
  WHERE T0."ObjType" = ?
    AND T0."DocEntry" = ?`;

/**
 * Set 'U_TargetRecDocNum' in the Draft once a GRPO is created using it
 * ODRF - Drafts Header table
 */
const updateDraftTargetRecDocNum = `UPDATE ${dbCreds.CompanyDB}.ODRF T0 SET T0."U_TargetRecDocNum" = ?
  WHERE T0."DocEntry" = ?`;

/**
 * Get the 'Rejected Reason' for a Draft
 */
const selectRejectedReason = `SELECT T0."U_DocEntry", T0."U_RejectedReason" FROM ${dbCreds.CompanyDB}."@APPROVALSTATUS" T0
    WHERE T0."U_DraftStatus" = '${draftStatus.REJECTED}'
  AND T0."U_DocEntry" IN `;

//To check the Approval Template table
/**
 * Get the record count to check if the User is an Approver. If the count is > 0, Dashboard
 *  & GRPO Request will show the records that are pending for approveral
 */
const selectApproverCount = `SELECT COUNT(T1."U_UserId") "Count"
  FROM ${dbCreds.CompanyDB}."@APPROVALHEADER" T0, ${dbCreds.CompanyDB}."@APPROVALAPPROVER" T1,
  ${dbCreds.CompanyDB}."@PORTALMODULES" T4
WHERE T0."DocEntry" = T1."DocEntry"
  AND T0."U_Active" = 'Y'
  AND T1."U_UserId" = ?
  AND T4."U_ModuleId" = T0."U_DocumentName"
  AND T4."U_ModuleName" = ?`;

/**
 * Get the record count to check if the User is an Originator. If the count is > 0, Dashboard
 *  & GRPO Request will show the records that are submitted by the originator
 */
const selectOriginatorCount = `SELECT COUNT(T1."U_UserId") "Count"
  FROM ${dbCreds.CompanyDB}."@APPROVALHEADER" T0, ${dbCreds.CompanyDB}."@APPROVALORIGINATOR" T1,
  ${dbCreds.CompanyDB}."@PORTALMODULES" T4
WHERE T0."DocEntry" = T1."DocEntry"
  AND T0."U_Active" = 'Y'
  AND T1."U_UserId" = ?
  AND T4."U_ModuleId" = T0."U_DocumentName"
  AND T4."U_ModuleName" = ?`;

/** Below two data will be used to populate 'counts' in the Dashboard screen */
//Get Draft records for given Approver
const selectDraftsForApprover = `SELECT T1."U_DocEntry", T1."U_DraftStatus", T0."U_DraftStatus" "ActualStatus", T0."U_OriginatorId"
  FROM ${dbCreds.CompanyDB}.ODRF T0, ${dbCreds.CompanyDB}."@APPROVALSTATUS" T1
WHERE T0."DocEntry" = T1."U_DocEntry"
  AND T1."U_DraftStatus" != 'NOT_ASSIGNED'
  AND T1."U_ApproverId" = ?
  AND T0."ObjType" = ?
  AND T0."CreateDate" > TO_DATE('01/03/20', 'MM/DD/YY')`; //added to remove really OLD Drafts that were creatd b4 Neo that were
//adding up to Approvers' Dashboard count
//Here '01/03/20' is an approx. Date which I thought was when client started using the app

//Get Draft records for a given Originator
const selectDraftsForOriginator = `SELECT T0."DocEntry", T0."U_DraftStatus"
  FROM ${dbCreds.CompanyDB}.ODRF T0
WHERE T0."U_OriginatorId" = ?
  AND T0."ObjType" = ?`;

module.exports = {
  dbCreds,
  serviceLayerSessionMaxAge,
  dbConfig,
  validateUserLogin,
  validateUserEmail,
  getUserPermissionsForAllModules,
  checkUserPermission,
  allFreightInfo,
  freightInfoForPO,
  branch,
  userBranches,
  itemsList,
  itemQuantityInWarehouse,
  binsAndItemQuantityInWarehouse,
  binsAndItemQuantityInWarehouseWithPrice,
  binsAndItemQuantityInWarehouseWithPriceList,
  binsList,
  selectInfoFromBatchSerialNo,
  batchForItemAndWH,
  serialForItemAndWH,
  getAllBinsForBatch,
  getAllBinsForSerial,
  vendorRefNoQuery,
  portalModules,
  portalUserGroups,
  updatePortalPassword,
  portalUsers,
  allUsers,
  userGroupsWithPermissions,
  userPermissionsForGivenGroup,
  usersInGivenGroup,
  insertUserGroup,
  insertPermissions,
  updateUserGroup,
  updatePermissions,
  deleteUserGroup,
  deletePermissions,
  selectApprovalHeader,
  selectApprovalOriginator,
  selectApprovalApprover,
  allHeaderIds,
  allApproverIds,
  allOriginatorIds,
  insertApprovalHeader,
  insertApprovalOriginator,
  insertApprovalApprover,
  updateApprovalHeader,
  updateApprovalOriginator,
  updateApprovalApprover,
  deleteApprovalTemplate1,
  deleteApprovalTemplate2,
  deleteApprovalTemplate3,
  deleteApprovalOriginator,
  deleteApprovalApprover,
  selectApproverForOriginator,
  selectUserInfo,
  selectUsersInUserGroup,
  selectUserGroupInUser,
  updateDraftTargetRecDocNum,
  selectRejectedReason,
  selectNoOfApprovalsForDraft,
  selectDraftApproversList,
  insertDraftApproversList,
  updateDraftApproversList,
  updateApprovalStatus,
  updateApprovalStatusRecState,
  selectDraftApprovalStatusCount,
  updateDraftNextApprovalLevel,
  selectDraftNextApproverDetails,
  selectDraftApprovalDate,
  selectDraftCreationDate,
  selectApproverCount,
  selectOriginatorCount,
  selectDraftsForApprover,
  selectDraftsForOriginator,
  binsListForItem,
};
