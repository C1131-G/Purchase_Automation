const { dbCreds } = require("./hana-db");
const { draftStatus } = require("../config/config");

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
 * Get Approval recs. based on DocEntry & Draft Status that is passed
 */
const selectDraftApprovalRecords = `SELECT T0."U_ApproverId"
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
 * Set the status of the next approver in the Approval heirarchy for a given Draft
 * APPROVALSTATUS - Table to store the Multi-Approver approval statuses
 */
const updateDraftNextApprovalLevel = `UPDATE ${dbCreds.CompanyDB}."@APPROVALSTATUS" T0
   SET T0."U_DraftStatus" = ?
 WHERE T0."U_DocEntry" = ?
   AND T0."U_ApprovalLevel" = ?`;

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
const insertDraftApproversList = `INSERT INTO ${dbCreds.CompanyDB}."@APPROVALSTATUS" ("DocEntry", "U_ApprovalStatusId", "U_DocEntry", 
  "U_DraftStatus", "U_ApproverId", "U_ApprovalLevel", "U_ModuleName") VALUES (?, ?, ?, ?, ?, ?, ?)`;

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

module.exports = {
  selectDraftApproversList,
  insertDraftApproversList,
  updateDraftApproversList,
  updateApprovalStatus,
  updateApprovalStatusRecState,
  selectDraftApprovalStatusCount,
  selectDraftApprovalRecords,
  updateDraftNextApprovalLevel,
  selectDraftNextApproverDetails,
  selectDraftApprovalDate,
};
