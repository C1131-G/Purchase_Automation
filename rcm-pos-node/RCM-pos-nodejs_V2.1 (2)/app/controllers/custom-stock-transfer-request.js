const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const querySTR = require("../config/query-stock-transfer-request");
const { userRoles, draftStatus } = require("../config/config");

const orderBy = ` ORDER BY T0."DocEntry" ASC`;
/**
 * Get Stock Transfer Requests (or Item details under a STR) to display on "Stock Transfer" screen
 */
const getTransferRequestRecords = (req, res) => {
  console.log("*** getTransferRequestRecords - req.query: " + JSON.stringify(req.query));
  console.log("*** getTransferRequestRecords - req.params: " + JSON.stringify(req.params));
  let rows = [],
    draftDocEntries = [],
    allApprovers = [],
    approvers = [],
    itemList = [];
  let reqsCreatedByApprover = [];
  const { userId } = req.session;

  try {
    //Get Row level (Item details) for the selected Transfer Req.
    if (req.params.type === "rows" && req.params.docEntry && req.params.recordType) {
      let sql;
      if (req.params.recordType === "direct") {
        sql = querySTR.selectItemDetailsForSTRs;
      } else if (req.params.recordType === "draft") {
        sql = querySTR.selectItemDetailsForSTRDrafts;
      }

      console.log("type: " + req.params.type + " docEntry:" + req.params.docEntry);
      rows = dbHelper.executeWithValues(sql + `(${req.params.docEntry})`, []);
      // console.log("reqsItemDetails: "+ JSON.stringify(reqsItemDetails));
      res.send({ rows });
    } else {
      if (req.query.userRole && userId) {
        let sql,
          where = "";

        if (req.query.userRole == userRoles.APPROVER) {
          sql = querySTR.selectStockTransRequestDraftsWithMultiApprover;
          // const where = ` AND T0."U_OriginatorId" = ?`;
          //get the list of Stock Transfer Requests created by the Approver himself, that are AUTO-APPROVED
          // reqsCreatedByApprover = getApprovedSTRRecords(where, userId);
        } else if (req.query.userRole == userRoles.ORIGINATOR) {
          sql = querySTR.selectStockTransRequestDrafts;
          where = ` AND T0."U_OriginatorId" = ? ${orderBy}`;
          //get the list of AUTO_APPROVED Stock Transfer Requests from OWTR table
          //created by the Approver himself
          reqsCreatedByApprover = getApprovedSTRRecords(
            ` AND T0."U_DraftStatus" = 'AUTO_APPROVED' ` + where,
            [userId],
          );
        }

        //Cond. added for 'Report' screen
        if (req.query.userRole == userRoles.ADMIN) {
          let where = ` AND T0."U_OriginatorId" IN (${req.query.originatorIds})
                        AND T0."DocDate" BETWEEN TO_DATE(?) AND TO_DATE(?)`;
          //req.query.originatorIds DIDN't Work here, so added above
          let filters = [req.query.fromDate, req.query.toDate];
          if (req.query.status && req.query.status !== "ALL") {
            where = where + ` AND T0."U_DraftStatus" IN (?)`;
            filters.push(req.query.status);
          }

          //get the list of AUTO_APPROVED Stock Transfer Requests from OWTR table
          //created by the Approver himself
          reqsCreatedByApprover = getApprovedSTRRecords(
            ` AND T0."U_DraftStatus" = 'AUTO_APPROVED' ` + where,
            filters,
          );

          where = where + orderBy;
          rows = dbHelper.executeWithValues(
            querySTR.selectStockTransRequestDrafts + where,
            filters,
          );
        } else {
          rows = dbHelper.executeWithValues(sql + where, [userId]);
        }
        if (Array.isArray(rows) && rows.length) {
          //Get the DocEntries for all the Drafts
          rows.forEach((draft) => {
            draftDocEntries.push(draft.DocEntry);
          });

          if (Array.isArray(draftDocEntries) && draftDocEntries.length) {
            //If the logged in user's role is ORIGINATOR get all the Approver details for the STRs
            //created by the Originator
            if (
              req.query.userRole == userRoles.ORIGINATOR ||
              req.query.userRole == userRoles.ADMIN ||
              req.query.userRole == userRoles.APPROVER
            ) {
              //Get Approvers for all the Drafts & then add them to the resp. Drafts
              allApprovers = dbHelper.executeWithValues(
                query.selectDraftApproversList +
                  `(${draftDocEntries}) ORDER BY T0."U_ApprovalLevel" ASC`,
                [],
              );
              if (Array.isArray(allApprovers) && allApprovers.length) {
                rows.forEach((draft) => {
                  approvers = [];
                  allApprovers.forEach((approver) => {
                    if (draft.DocEntry == approver.U_DocEntry) {
                      approvers.push(approver);
                    }
                  });
                  draft.approvers = approvers;
                });
              }
            }
          }
        }
        /*if(Array.isArray(reqsCreatedByApprover) && reqsCreatedByApprover.length) {
          rows.concat(reqsCreatedByApprover);
          console.log("rows: "+ JSON.stringify(rows));
        }*/
        res.send([...rows, ...reqsCreatedByApprover]);
      } else if (req.query.requestStatus === draftStatus.APPROVED) {
        console.log("***** getApprovedSTRRecords");
        //TODO: Temporarily commenting out the WHERE cond. to let users create ST via STRs created outside NEO
        // const where = ` AND T0."U_OriginatorId" IS NOT NULL`;
        // reqsCreatedByApprover = getApprovedSTRRecords(where);

        reqsCreatedByApprover = getApprovedSTRRecords();
        res.send(reqsCreatedByApprover);
      }
    }
  } catch (err) {
    console.log("getTransferRequestRecords - controller - error: " + JSON.stringify(err));
    // let message = "Something went wrong. Please try again or contact your administrator"
    // if(err.message)
    //   message = err.message;
    res.status(500).send({ message: err.message });
  }
};

/**
 * Returns the list of ST Request with their Row details. Thse records will be listed in both STR screen &
 * when creating new ST from approved STR
 * @param {String} where   Condition for WHERE clause
 * @param {Number} userId
 */
const getApprovedSTRRecords = (where = "", userId = []) => {
  // let reqDocEntries = [0], itemList = [], reqsCreatedByApprover = [];
  let reqsCreatedByApprover = [];
  try {
    reqsCreatedByApprover = dbHelper.executeWithValues(querySTR.selectApprovedSTR + where, userId);
    // console.log("reqsCreatedByApprover: "+ JSON.stringify(reqsCreatedByApprover));
    return reqsCreatedByApprover;
  } catch (err) {
    throw err;
  }
};

module.exports = { getTransferRequestRecords, getApprovedSTRRecords };
