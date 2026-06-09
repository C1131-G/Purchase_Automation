const { dbCreds } = require("./hana-db");
const { draftObjectCodes } = require("../config/config");

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

    //NOTE: DocNum not required for Draft recs. as they will be all same anyway
    T0."DocNum", 
 */
const selectStockTransDrafts = `SELECT T0."DocEntry", T0."DocStatus", T0."DocDate", T0."DocTime", T0."Comments", T0."CreateDate",
  T0."U_OriginatorId", T0."U_ApproverId", T0."U_DraftStatus", TOR."U_NAME" as "Originator",
  T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T0."ToWhsCode", T0."U_TargetRecDocNum",
  T0."U_ToBinLocation", T0."BPLName"
    FROM ${dbCreds.CompanyDB}.ODRF T0, ${dbCreds.CompanyDB}.OUSR TOR
  WHERE T0."ObjType" = ${draftObjectCodes.STOCK_TRANSFER}
    AND T0."U_OriginatorId" = TOR."INTERNAL_K"`;
// AND T0."U_OriginatorId" = ?`;

/**
 * Get ST Drafts for a given Approver. This data will be shown in Approver's 'Stock Transfer s' screen
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

   //NOTE: DocNum not required for Draft recs. as they will be all same anyway
   T0."DocNum", 
 */
const selectStockTransDraftsWithMultiApprover = `SELECT T0."DocEntry", T0."DocStatus", T0."DocDate", T0."DocTime", T0."Comments", T0."CreateDate",
T0."U_OriginatorId", TOR."U_NAME" as "Originator", T0."ToWhsCode",
T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T1."U_ApprovalStatusId", T1."U_DocEntry", T1."U_ApproverId",
T0."U_DraftStatus", T1."U_ApprovalLevel", T1."U_RejectedReason", T0."U_TargetRecDocNum",
T0."U_ToBinLocation", T0."BPLName"
  FROM ${dbCreds.CompanyDB}.ODRF T0, ${dbCreds.CompanyDB}.OUSR TOR, ${dbCreds.CompanyDB}."@APPROVALSTATUS" T1
WHERE T0."ObjType" = ${draftObjectCodes.STOCK_TRANSFER}
  AND T0."U_OriginatorId" = TOR."INTERNAL_K"
  AND T0."DocEntry" = T1."U_DocEntry"
  AND T1."U_ApproverId" = ?
  AND T1."U_DraftStatus" != 'NOT_ASSIGNED'
ORDER BY T0."DocEntry" ASC`;

/** Replaced TRW."FromWhsCod", with TRW."U_FromWarehouse" as the former one doesnt return correct value */
const selectItemDetailsForSTDrafts = `SELECT TRW."DocEntry", TRW."LineNum", TRW."ItemCode", TRW."Dscription" as "ItemName", TRW."Quantity", TRW."unitMsr" AS "InvntryUom",
  TRW."WhsCode", TRW."FromWhsCod" as "FromWarehouse", "U_FromBinLoc", TRW."U_ToBinLocation"
FROM ${dbCreds.CompanyDB}.DRF1 TRW
  WHERE TRW."DocEntry" IN `;

/**
 * OWTR - Stock Transfer Header table
 * WTR1 - Stock Transfer Row table
 * NOTE: Add alias DocEntry for DocNum so that it will match the above Draft column name
 */
/**
 * Removd from the qry & added a separate (below) query for pulling Row level data
 T1."ItemCode", T1."Dscription" as "ItemName", T1."Quantity", T1."unitMsr", T1."OpenQty",
 T1."WhsCode", T1."FromWhsCod",

 , ${dbCreds.CompanyDB}.WTR1 T1

T0."DocEntry" = T1."DocEntry"
  AND 
 */
const selectApprovedSTs = `SELECT T0."DocNum" as "DocEntry", T0."DocEntry" as "ActualDocEntry", T0."DocDate", T0."Comments",
 T0."U_DraftStatus", T0."U_OriginatorId", TOR."U_NAME" as "Originator", T0."ToWhsCode",
 T0."U_ToBinLocation", T0."BPLName"
    FROM ${dbCreds.CompanyDB}.OWTR T0, ${dbCreds.CompanyDB}.OUSR TOR
  WHERE T0."U_OriginatorId" = TOR."INTERNAL_K"
    AND T0."U_DraftStatus" = 'AUTO_APPROVED'`;

/**
 * Get Row level info (Item details) for given Stock Transfer Req. DocEntries
 */
//NOTE:
const selectItemDetailsForSTs = `SELECT T1."DocEntry", T1."ItemCode", T1."Dscription" as "ItemName", T1."Quantity", T1."unitMsr" AS "InvntryUom",
   T1."WhsCode", T1."FromWhsCod" "FromWarehouse", T1."U_FromBinLoc", T1."U_ToBinLocation"
 FROM ${dbCreds.CompanyDB}.WTR1 T1
   WHERE T1."DocEntry" IN `;

/**
 * Get DocEntry for a given DocNum (used to generated Crystal Report)
 * OWTR            - ST Header table
 */
const selectSTDocEntry = `SELECT T0."DocEntry", T0."DocNum"
   FROM ${dbCreds.CompanyDB}.OWTR T0
 WHERE T0."DocNum" = ?`;

module.exports = {
  selectStockTransDrafts,
  selectStockTransDraftsWithMultiApprover,
  selectApprovedSTs,
  selectItemDetailsForSTDrafts,
  selectItemDetailsForSTs,
  selectSTDocEntry,
};
