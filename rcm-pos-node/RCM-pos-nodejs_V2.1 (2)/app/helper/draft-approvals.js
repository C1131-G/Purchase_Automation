const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const queryDA = require("../config/query-draft-approvals");
const { draftStatus, portalModules } = require("../config/config");
const { getRandomNo } = require("../utils/utils");
const { sendMail } = require("../helper/send-mail");
const newRequestNotification = require("../mail-templates/new-request-notification");

/**
 * Get the No. of Days b/w Creation Date (or prev. Approval Date) & the Draft Creation Date
 * @param {Number} docEntry
 * @param {Number} approvalLevel
 * @param {String} multiLevelApproval 'Y' or 'N'
 * @returns
 */
const getApprovalInternalInDays = (docEntry, approvalLevel = 0, multiLevelApproval, moduleName) => {
  let date,
    diffDays = 100;
  let sql,
    filters = [];

  const queryIR = new ProductionDraftQueries(moduleName);

  //get previous Approval Level no.
  approvalLevel = parseInt(approvalLevel);

  //if the Approval Level is '1' (or if the Multi Level is 'Turned Off')
  //get Draft's creation date or else get the prev. Approval Date
  if (approvalLevel === 1 || multiLevelApproval === "N") {
    sql = query.selectDraftCreationDate;
    filters = [docEntry];
  } else {
    sql = queryDA.selectDraftApprovalDate;
    filters = [docEntry, approvalLevel - 1];
  }
  console.log("sql: " + sql);
  try {
    //Get the previous approver's Approval Date
    const rows = dbHelper.executeWithValues(sql, filters);
    console.log("getApprovalInternalInDays %s", JSON.stringify(rows));
    if (Array.isArray(rows) && rows.length) {
      date = rows[0].DocDate;
    }
  } catch (err) {
    console.log("getApprovalInternalInDays - controller - error: " + JSON.stringify(err));
  }

  //get date diff. b/w Today's date & the Creation/ prev. Approved Date
  if (date) {
    const diffTime = Math.abs(new Date() - new Date(date));
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
  }
  return diffDays;
};

/**
 * #1. In a NON Multi-level approval setup, when the No. of the Approvals required
 * for a draft is received, the statuses of the Approval records created for the
 * rest of the Approvers that are in PENDING or NOT_ASSIGNED status will be changed to GENERATED
 *
 * #2. Also, when one Approver 'rejects' the request, the statuses of the Approval recs.
 * created for other Approver's will be set as NOT_REQUIRED
 *
 * @param {String} approvalStatus
 * @param {Number} docEntry
 */
const setApprovalStatus = (approvalStatus, docEntry, moduleName) => {
  let status;
  if (approvalStatus === draftStatus.APPROVED) {
    status = draftStatus.GENERATED;
  } else if (approvalStatus === draftStatus.REJECTED) {
    status = draftStatus.NOT_REQUIRED;
  }
  try {
    let sql = queryDA.updateApprovalStatus;
    let filters = [status, docEntry];
    const rows = dbHelper.executeWithValues(sql, filters);
    console.log("setApprovalStatus %s", JSON.stringify(rows));
    return true;
  } catch (err) {
    console.log("getApprovalInternalInDays - controller - error: " + JSON.stringify(err));
    return false;
  }
};

/**
 * Get Approver records for a given Originator & Module
 * @param {Number} originatorId   Originator's UserId
 * @param {String} moduleName     Module Name
 */
const getApprovers = (originatorId, moduleName) => {
  try {
    const result = dbHelper.executeWithValues(query.selectApproverForOriginator, [
      originatorId,
      moduleName,
    ]);
    console.log("result: " + JSON.stringify(result)); //ApproverId, UserName, Email
    return result;
  } catch (err) {
    throw err;
  }
};

/**
 * Get Approver records for given Draft DocEntries
 * @param {Number} docEntries   DocEntries
 */
const getApproversForDraft = (docEntries) => {
  try {
    const result = dbHelper.executeWithValues(
      query.selectDraftApproversList + `(${docEntries}) ORDER BY T0."U_ApprovalLevel" ASC`,
      [],
    );
    console.log("result: " + JSON.stringify(result)); //ApproverId, UserName, Email
    return result;
  } catch (err) {
    throw err;
  }
};

/**
 * Inactivates/Activates the Approver records for a givn Draft DocNum
 * @param {Number} docEntry
 * @param {String} state    ACTIVE/INACTIVE
 */
const updateDraftApprovers = (docEntry, state, moduleName) => {
  try {
    let sql = queryDA.updateApprovalStatusRecState;
    let filters = [state, docEntry];
    const draftApproverRec = dbHelper.executeWithValues(sql, filters); //recordState.INACTIVE
    console.log("draftApproverRec: " + JSON.stringify(draftApproverRec));
    return true;
  } catch (err) {
    throw err;
  }
};

/**
 * Creates Approvers List for a given Draft
 * @param {Number} docEntry
 * @param {Array}  approverRec  Approvers list for the current Originator
 */
const createApproversForDraft = async (docEntry, approverRec, moduleName) => {
  let multiApproverList = [],
    mailingList = [];
  let approvalLevel, approvalStatusId;

  try {
    approverRec.map((approver) => {
      approvalLevel = 0;
      approvalStatusId = getRandomNo();
      if (approver.U_MultiLevelApproval === "Y") {
        approvalLevel = approver.U_ApprovalLevel;

        //add only Level-1 Approver's mail to the mailing list if Multi-level Approval is enabled
        if (approver.U_ApprovalLevel == 1) {
          mailingList.push({
            UserName: approver.UserName,
            Email: approver.Email,
          });
          //Approver info to be inserted to Draft APPROVALSTATUS table
          //set the status as PENDING only for Level #1
          multiApproverList.push([
            approvalStatusId,
            approvalStatusId,
            docEntry,
            draftStatus.PENDING,
            approver.ApproverId,
            approvalLevel,
          ]);
        } else {
          //NOT_ASSIGNED Approval requests will not showup in the Approvers "Stock Transfer Request" screen
          multiApproverList.push([
            approvalStatusId,
            approvalStatusId,
            docEntry,
            draftStatus.NOT_ASSIGNED,
            approver.ApproverId,
            approvalLevel,
          ]);
        }
      } else {
        //add ALL the Approvers' mail to the mailing list if Multi-level Approval is NOT enabled
        mailingList.push({
          UserName: approver.UserName,
          Email: approver.Email,
        });
        multiApproverList.push([
          approvalStatusId,
          approvalStatusId,
          docEntry,
          draftStatus.PENDING,
          approver.ApproverId,
          approvalLevel,
        ]);
      }
    });

    let sql = query.insertDraftApproversList;

    console.log("multiApproverList: " + multiApproverList);
    console.log("mailingList: " + mailingList);

    const draftApproverRec = dbHelper.executeBatchInsertUpdate(sql, multiApproverList);
    console.log("draftApproverRec: " + JSON.stringify(draftApproverRec)); //ApproverId, UserName, Email

    return { draftApproverRec, mailingList };
  } catch (err) {
    throw err;
  }
};

/**
 * Sends mail notification to the Approvers
 * @param {*} moduleName
 * @param {*} userName
 * @param {*} docEntry
 * @param {*} mailingList
 */
const notifyApprovers = async (moduleName, userName, docEntry, mailingList) => {
  try {
    const mailBody = newRequestNotification.getMailBody(moduleName, userName, docEntry);
    mailingList.forEach(async (ele) => {
      await sendMail(ele.Email, newRequestNotification.subject, mailBody);
    });
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getApprovalInternalInDays,
  setApprovalStatus,
  getApprovers,
  getApproversForDraft,
  updateDraftApprovers,
  createApproversForDraft,
  notifyApprovers,
};
