/**
 * SAMPLE - NOT Required for POS
 */

const dbHelper = require("./db");
const {
  itemTypes,
  draftStatus,
  userRoles,
  draftObjectCodes,
  portalModules,
} = require("../config/config");
const deliveryQuery = require("../config/query-delivery");

const draftApprovalHelper = require("../helper/draft-approvals");
const draftHelper = require("../helper/draft.helper");

const moduleName = portalModules.DELIVERY;

/**
 * Get Delivery info using customerRefNo
 * @param {Number} customerRefNo
 * @returns
 */
exports.getDeliveryWithCustomerRefNo = (customerRefNo) => {
  try {
    const result = dbHelper.executeWithValues(deliveryQuery.selectDeliveryWithCustomerRefNoQuery, [
      customerRefNo,
    ]);
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * Get Item details for a selected Draft
 * @param {Number} docNum
 */
exports.getItemDetails = (docNum) => {
  try {
    console.log("docNum:" + docNum);
    const rows = dbHelper.executeWithValues(deliveryQuery.selectItemDetails + `(${docNum})`, []);
    console.log("Delivery - getItemDetails: " + JSON.stringify(rows));
    return rows;
  } catch (err) {
    throw err;
  }
};

/**
 * Get Tax details for a selected Draft
 * @param {Number} docNum
 */
exports.getTaxDetails = (docNum) => {
  try {
    console.log("docNum:" + docNum);
    const rows = dbHelper.executeWithValues(deliveryQuery.selectTaxTotal, [docNum]);
    console.log("Delivery - getTaxDetails: " + JSON.stringify(rows));
    return rows;
  } catch (err) {
    throw err;
  }
};

/**
 * Gets Approved Deliveries & Drafts (with Approver Info) based on the filter passed
 * @param {*} filter
 */
exports.getDeliveryRecords = (filter) => {
  console.log("### getDeliveryRecords - filter: " + JSON.stringify(filter));
  try {
    let drafts = [],
      approvedRecords = [];
    const objectType = draftObjectCodes[moduleName];

    if (filter.userRole == userRoles.APPROVER) {
      drafts = draftHelper.getDraftsForApprover(objectType, filter.userId);

      // const where = ` AND T0."U_OriginatorId" = ?`;
      //get the list of AUTO_APPROVED recs. created by the Approver himself
      // approvedRecords = getAutoApprovedRecords(where, [filter.userId]);
    } else if (filter.userRole == userRoles.ORIGINATOR) {
      const where = ` AND T0."U_OriginatorId" = ?`;
      drafts = draftHelper.getDrafts(where, [objectType, filter.userId]);

      //get the list of AUTO_APPROVED recs. created by the Approver himself
      approvedRecords = getAutoApprovedRecords(where, [filter.userId]);
    }

    //Cond. added for 'Report' screen
    else if (filter.userRole == userRoles.ADMIN) {
      let values = [];
      let where = ` AND T0."U_OriginatorId" IN (${filter.originatorIds})
                    AND T0."DocDate" BETWEEN TO_DATE(?) AND TO_DATE(?)`;
      values.push(filter.fromDate, filter.toDate);

      if (filter.status && filter.status !== "ALL") {
        where = where + ` AND T0."U_DraftStatus" IN (?)`;
        values.push(filter.status);
      }
      drafts = draftHelper.getDrafts(where, [objectType, ...values]);
      approvedRecords = getAutoApprovedRecords(where, values);
    }

    if (Array.isArray(drafts) && drafts.length) {
      let draftDocEntries = [];
      //Get the DocEntries for all the Drafts
      drafts.forEach((draft) => {
        draftDocEntries.push(draft.DocEntry);
      });

      if (Array.isArray(draftDocEntries) && draftDocEntries.length) {
        //Get Approvers for all the Drafts & then add them to the resp. Drafts
        const allApprovers = draftApprovalHelper.getApproversForDraft(draftDocEntries);

        console.log("allApprovers: " + JSON.stringify(allApprovers));
        if (Array.isArray(allApprovers) && allApprovers.length) {
          let approvers = [];
          drafts.forEach((draft) => {
            allApprovers.forEach((approver) => {
              if (draft.DocEntry == approver.U_DocEntry) {
                approvers.push(approver);
              }
            });
            draft.approvers = approvers;
            approvers = [];
          });
        }
      }
    }
    return [...drafts, ...approvedRecords];
  } catch (err) {
    console.log("getDeliveryRecords - controller - error: " + JSON.stringify(err));
    throw err;
  }
};

/**
 * Gets the list of AUTO_APPROVED recs.
 * @param {String} where   Condition for WHERE clause
 * @param {Number} filters
 */
const getAutoApprovedRecords = (where = "", filters = []) => {
  const orderBy = ` ORDER BY T0."DocEntry" ASC`;
  try {
    const rows = dbHelper.executeWithValues(
      deliveryQuery.selectApprovedDeliveries + where + orderBy,
      filters,
    );
    console.log("getAutoApprovedRecords: " + JSON.stringify(rows));
    return rows;
  } catch (err) {
    throw err;
  }
};
