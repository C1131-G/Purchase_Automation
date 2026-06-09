const { dbCreds } = require("./hana-db");
const { draftObjectCodes, recordState } = require("../config/config");

/**
 * Get ST Req Drafts of given ApproverId or OriginatorId
 * ODRF            - Drafts Header table
 * OUSR            - User Table
 * "ObjType" ='1250000001' - Stock Trans Req. Object Type
 */
/**
 * Removd from the qry & added a separate query for pulling Row level data
 * TRW."ItemCode", TRW."Dscription" as "ItemName", TRW."Quantity", TRW."unitMsr",
  TRW."WhsCode", TRW."FromWhsCod",

 ${dbCreds.CompanyDB}.DRF1 TRW, 
    AND T0."DocEntry" = TRW."DocEntry"
 */
const selectStockTransRequestDrafts = `SELECT T0."DocNum", T0."DocEntry", T0."DocStatus", T0."DocDate", T0."DocTime", T0."Comments", 
  T0."CreateDate",
  T0."U_OriginatorId", T0."U_ApproverId", T0."U_DraftStatus", TOR."U_NAME" as "Originator",
  T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T0."ToWhsCode", T0."Filler" "FromWarehouse",
  T0."U_TargetRecDocNum", T0."U_ToBinLocation", T0."BPLName"
    FROM ${dbCreds.CompanyDB}.ODRF T0, ${dbCreds.CompanyDB}.OUSR TOR
  WHERE T0."ObjType" = ${draftObjectCodes.STOCK_TRANSFER_REQUEST}
    AND T0."U_OriginatorId" = TOR."INTERNAL_K"`; //T0."FromWarehouse",
//AND T0."U_OriginatorId" IN (?)
// ORDER BY T0."DocEntry" ASC

/**
 * Get STReq Drafts for a given Approver. This data will be shown in Approver's 'Stock Transfer Requests' screen
 * ODRF            - Drafts Header table
 * DRF1            - Draft Row Table
 * OUSR            - User Table
 * APPROVALSTATUS  - Table where multi-approver data is stored
 * "ObjType" ='1250000001' - Stock Trans Req. Object Type
 */
/**
 * Removd from the qry & added a separate (below) query for pulling Row level data
 * TRW."ItemCode", TRW."Dscription" as "ItemName", TRW."Quantity", TRW."unitMsr",
TRW."WhsCode", TRW."FromWhsCod",

${dbCreds.CompanyDB}.DRF1 TRW, 

   AND T0."DocEntry" = TRW."DocEntry"
 */
const selectStockTransRequestDraftsWithMultiApprover = `SELECT T0."DocNum", T0."DocEntry", T0."DocStatus", T0."DocDate", T0."DocTime", T0."Comments", 
T0."CreateDate",
T0."U_OriginatorId", TOR."U_NAME" as "Originator", T0."ToWhsCode", T0."Filler" "FromWarehouse",
T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T1."U_ApprovalStatusId", T1."U_DocEntry", T1."U_ApproverId",
T0."U_DraftStatus", T1."U_ApprovalLevel", T1."U_RejectedReason", T0."U_TargetRecDocNum",
T0."U_ToBinLocation", T0."BPLName", T0."SlpCode" "SalesPersonCode"
  FROM ${dbCreds.CompanyDB}.ODRF T0, ${dbCreds.CompanyDB}.OUSR TOR, ${dbCreds.CompanyDB}."@APPROVALSTATUS" T1
WHERE T0."ObjType" = ${draftObjectCodes.STOCK_TRANSFER_REQUEST}
  AND T0."U_OriginatorId" = TOR."INTERNAL_K"
  AND T0."DocEntry" = T1."U_DocEntry"
  AND T1."U_ApproverId" = ?
  AND T1."U_DraftStatus" != 'NOT_ASSIGNED'
ORDER BY T0."DocEntry" ASC`; //T0."FromWarehouse",  Invalid column
//AND T1."U_State" != '${recordState.INACTIVE}'

/** Replaced TRW."FromWhsCod", with TRW."U_FromWarehouse" as the former doesnt return correct value */
const selectItemDetailsForSTRDrafts = `SELECT TRW."DocEntry", TRW."LineNum", TRW."ItemCode", TRW."Dscription" as "ItemName", TRW."Quantity", 
  TRW."unitMsr" AS "InvntryUom", TRW."WhsCode", TRW."U_FromWarehouse", TRW."U_ToBinLocation",
  TRW."U_FromBinLoc"
FROM ${dbCreds.CompanyDB}.DRF1 TRW
  WHERE TRW."DocEntry" IN `; //, TRW."U_FromWarehouse" as "FromWarehouse"

/**
 * OWTQ - Stock Transfer Request Header table
 * WTQ1 - Stock Transfer Request Row table
 * NOTE: Add alias DocEntry for DocNum so that it will match the above Draft column name
 */
/**
 * Removd from the qry & added a separate (below) query for pulling Row level data
 T1."ItemCode", T1."Dscription" as "ItemName", T1."Quantity", T1."unitMsr", T1."OpenQty",
 T1."WhsCode", T1."FromWhsCod",

 , ${dbCreds.CompanyDB}.WTQ1 T1

T0."DocEntry" = T1."DocEntry"
  AND 
  --'Self' as "Originator"
 */
const selectApprovedSTR = `SELECT T0."DocNum" as "DocEntry", T0."DocEntry" as "ActualDocEntry", T0."DocDate", T0."Comments",
  T0."U_DraftStatus", T0."U_OriginatorId", TOR."U_NAME" as "Originator", T0."Filler" "FromWarehouse",
  T0."ToWhsCode", T0."U_ToBinLocation", T0."BPLName", T0."SlpCode" "SalesPersonCode", T0."U_Location"
    FROM ${dbCreds.CompanyDB}.OWTQ T0
  LEFT OUTER JOIN ${dbCreds.CompanyDB}.OUSR TOR ON T0."U_OriginatorId" = TOR."INTERNAL_K"
  WHERE T0."DocStatus" = 'O'`; //T0."FromWhsCode",
/**
 * Get Row level info (Item details) for given Stock Transfer Req. DocEntries
 */
const selectItemDetailsForSTRs = `SELECT T1."DocEntry", T1."LineNum", T1."ItemCode", T1."Dscription" as "ItemName", T1."Quantity", T1."unitMsr" AS "InvntryUom",
   T1."WhsCode", T1."FromWhsCod" "FromWarehouse", T1."U_ToBinLocation", T1."U_FromBinLoc"
 FROM ${dbCreds.CompanyDB}.WTQ1 T1
   WHERE T1."DocEntry" IN `; //, T1."FromWhsCode", "FromWarehouse", "FromWarehouseCode" - ALL are INVALID

module.exports = {
  selectStockTransRequestDrafts,
  selectStockTransRequestDraftsWithMultiApprover,
  selectApprovedSTR,
  selectItemDetailsForSTRDrafts,
  selectItemDetailsForSTRs,
};
