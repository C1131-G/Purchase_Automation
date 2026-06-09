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
const selectDrafts = `SELECT T0."DocEntry", T0."DocStatus", T0."DocDate", T0."DocTime", T0."Comments", 
  T0."CreateDate", T0."CardCode", T0."CardName", T0."NumAtCard", T0."DocTotal",
  T0."U_OriginatorId", T0."U_ApproverId", T0."U_DraftStatus", TOR."U_NAME" as "Originator",
  T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T0."ToWhsCode", T0."Filler" "FromWarehouse",
  T0."U_TargetRecDocNum", T0."U_ToBinLocation", T0."BPLName",
  T0."DocCur", T0."DiscPrcnt" "DiscountPercent", T0."DiscSum" "TotalDiscount", T0."DiscSumFC" "TotalDiscountFC"
    FROM ${dbCreds.CompanyDB}.ODRF T0, ${dbCreds.CompanyDB}.OUSR TOR
  WHERE T0."U_OriginatorId" = TOR."INTERNAL_K"
    AND T0."ObjType" = ?`; //T0."FromWarehouse",
//T0."ObjType" = ?
//AND T0."U_OriginatorId" IN (?)
// ORDER BY T0."DocEntry" ASC

/**
 * Get STReq Drafts for a given Approver. This data will be shown in Approver's 'Stock Transfer Requests' screen
 * ODRF            - Drafts Header table
 * DRF1            - Draft Row Table
 * OUSR            - User Table
 * APPROVALSTATUS  - Table where multi-approver data is stored
 */
/**
 * Removd from the qry & added a separate (below) query for pulling Row level data
 * TRW."ItemCode", TRW."Dscription" as "ItemName", TRW."Quantity", TRW."unitMsr",
TRW."WhsCode", TRW."FromWhsCod",

${dbCreds.CompanyDB}.DRF1 TRW, 

   AND T0."DocEntry" = TRW."DocEntry"
 */
const selectDraftsWithMultiApprover = `SELECT T0."DocEntry", T0."DocStatus", T0."DocDate", T0."DocTime", T0."Comments", 
T0."CreateDate", T0."CardCode", T0."CardName", T0."NumAtCard", T0."DocTotal",
T0."U_OriginatorId", TOR."U_NAME" as "Originator", T0."ToWhsCode", T0."Filler" "FromWarehouse",
T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T1."U_ApprovalStatusId", T1."U_DocEntry", T1."U_ApproverId",
T0."U_DraftStatus", T1."U_ApprovalLevel", T1."U_RejectedReason", T0."U_TargetRecDocNum",
T0."U_ToBinLocation", T0."BPLName",
T0."DocCur", T0."DiscPrcnt" "DiscountPercent", T0."DiscSum" "TotalDiscount", T0."DiscSumFC" "TotalDiscountFC"
  FROM ${dbCreds.CompanyDB}.ODRF T0, ${dbCreds.CompanyDB}.OUSR TOR, ${dbCreds.CompanyDB}."@APPROVALSTATUS" T1
WHERE T0."ObjType" = ?
  AND T0."U_OriginatorId" = TOR."INTERNAL_K"
  AND T0."DocEntry" = T1."U_DocEntry"
  AND T1."U_ApproverId" = ?
  AND T1."U_DraftStatus" != 'NOT_ASSIGNED'
ORDER BY T0."DocEntry" ASC`; //T0."FromWarehouse",  Invalid column
//AND T1."U_State" != '${recordState.INACTIVE}'

/** Replaced TRW."FromWhsCod", with TRW."U_FromWarehouse" as the former doesnt return correct value */
const selectItemDetailsForDrafts = `SELECT TRW."LineNum", TRW."LineStatus", TRW."DocEntry", TRW."LineNum", TRW."ItemCode", TRW."Dscription" as "ItemName", TRW."Quantity", 
  TRW."unitMsr" AS "InvntryUom", TRW."WhsCode", TRW."U_FromWarehouse", TRW."U_ToBinLocation",
  TRW."U_FromBinLoc"
FROM ${dbCreds.CompanyDB}.DRF1 TRW
  WHERE TRW."DocEntry" IN `; //, TRW."U_FromWarehouse" as "FromWarehouse"

/** Get TaxTotal for a Draft
 * ODRF - Drafts Header table
 * DRF4 - Draft Tax info table
 */
const selectDraftTaxTotal = `SELECT T0."DocEntry", T0."DocNum", T1."TaxSum", T1."TaxSumFrgn", T1."TaxSumSys"
  FROM ${dbCreds.CompanyDB}.ODRF T0
LEFT JOIN ${dbCreds.CompanyDB}.DRF4 T1 ON T0."DocEntry" = T1."DocEntry"
  WHERE T0."DocEntry" IN `;

const updateDraft = `UPDATE ${dbCreds.CompanyDB}.ODRF T0 SET `;

module.exports = {
  selectDrafts,
  selectDraftsWithMultiApprover,
  selectItemDetailsForDrafts,
  selectDraftTaxTotal,
  updateDraft,
};
