const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const queryST = require("../config/query-stock-transfer");
const { sendMail } = require("../helper/send-mail");
const { userRoles, portalModules, draftStatus } = require("../config/config");

const orderBy = ` ORDER BY T0."DocEntry" ASC`;
/**
 * Get Drafts to display (on "Requests" screen)
 * & Item details for a selected Draft (on Draft popup)
 */
const getTransferRecords = (req, res) => {
  console.log("### getTransferRecords - req.query: " + JSON.stringify(req.query));
  let rows = [],
    draftDocEntries = [],
    allApprovers = [],
    approvers = [],
    itemList = [];
  let reqsCreatedByApprover = [];
  const { userId } = req.session;

  try {
    //Get Row level (Item details) for the selected ST
    if (req.params.type === "rows" && req.params.docEntry && req.params.recordType) {
      let sql;
      if (req.params.recordType === "direct") {
        sql = queryST.selectItemDetailsForSTs;
      } else if (req.params.recordType === "draft") {
        sql = queryST.selectItemDetailsForSTDrafts;
      }

      console.log("type: " + req.params.type + " docEntry:" + req.params.docEntry);
      rows = dbHelper.executeWithValues(sql + `(${req.params.docEntry})`, []);
      // console.log("reqsItemDetails: "+ JSON.stringify(reqsItemDetails));
      res.send({ rows });
    } else if (req.query.userRole && userId) {
      let sql,
        where = "";

      if (req.query.userRole == userRoles.APPROVER) {
        sql = queryST.selectStockTransDraftsWithMultiApprover;
        // const where = ` AND T0."U_OriginatorId" = ?`;
        // //get the list of Stock Transfer Requests created by the Approver himself, that are AUTO-APPROVED
        // reqsCreatedByApprover = getApprovedSTRecords(where, [userId]);
      } else if (req.query.userRole == userRoles.ORIGINATOR) {
        sql = queryST.selectStockTransDrafts;
        where = ` AND T0."U_OriginatorId" = ? ${orderBy}`;
        //get the list of AUTO_APPROVED Stock Transfer Requests from OWTR table
        //created by the Approver himself
        reqsCreatedByApprover = getApprovedSTRecords(where, [userId]);
      }

      //Cond. added for 'Report' screen
      if (req.query.userRole == userRoles.ADMIN) {
        let where = ` AND T0."U_OriginatorId" IN (${req.query.originatorIds})
                      AND T0."DocDate" BETWEEN TO_DATE(?) AND TO_DATE(?)`;
        let filters = [req.query.fromDate, req.query.toDate];
        if (req.query.status && req.query.status !== "ALL") {
          where = where + ` AND T0."U_DraftStatus" IN (?)`;
          filters.push(req.query.status);
        }

        where = where + orderBy;
        rows = dbHelper.executeWithValues(queryST.selectStockTransDrafts + where, filters);
        reqsCreatedByApprover = getApprovedSTRecords(where, filters);
        //req.query.originatorIds, req.query.status, req.query.fromDate, req.query.toDate);
      } else {
        rows = dbHelper.executeWithValues(sql + where, [userId]);
      }
      if (Array.isArray(rows) && rows.length) {
        //Get the DocEntries for all the Drafts
        rows.forEach((draft) => {
          draftDocEntries.push(draft.DocEntry);
        });

        if (Array.isArray(draftDocEntries) && draftDocEntries.length) {
          //If the logged in user's role is ORIGINATOR get all the Approver details for the STs created by the Originator
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
            console.log("allApprovers: " + JSON.stringify(allApprovers));
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

          //Get Row level (Item details) for all the Transfer Reqs. Drafts & then add them to the resp. Drafts
          const reqDraftItemDetails = dbHelper.executeWithValues(
            queryST.selectItemDetailsForSTDrafts + `(${draftDocEntries})`,
          );
          if (Array.isArray(reqDraftItemDetails) && reqDraftItemDetails.length) {
            let fromWarehouse; //toWarehouse,
            rows.forEach((req) => {
              itemList = [];
              reqDraftItemDetails.forEach((item) => {
                if (req.DocEntry === item.DocEntry) {
                  itemList.push(item);
                }
                /*if(!toWarehouse) {
                  toWarehouse = item.WhsCode;
                }*/
                if (!fromWarehouse) {
                  fromWarehouse = item.FromWhsCod;
                  //fromWarehouse = item.U_FromWarehouse;
                }
              });
              req.itemList = itemList;
              // req.WhsCode = toWarehouse;
              req.FromWhsCod = fromWarehouse;
            });
          }
        }
      }
      /*if(Array.isArray(reqsCreatedByApprover) && reqsCreatedByApprover.length) {
        rows.concat(reqsCreatedByApprover);
        console.log("rows: "+ JSON.stringify(rows));
      }*/
      res.send([...rows, ...reqsCreatedByApprover]);
    }
  } catch (err) {
    console.log("getTransferRecords - controller - error: " + JSON.stringify(err));
    // let message = "Something went wrong. Please try again or contact your administrator"
    // if(err.message)
    //   message = err.message;
    res.status(500).send({ message });
  }
};

/**
 * Returns the list of ST with their Row details. Thse records will be listed in the ST screen
 * @param {String} where   Condition for WHERE clause
 * @param {Number} userId
 */
const getApprovedSTRecords = (where = "", filters = []) => {
  let reqDocEntries = [0],
    itemList = [],
    reqsCreatedByApprover = [];
  try {
    reqsCreatedByApprover = dbHelper.executeWithValues(queryST.selectApprovedSTs + where, filters);
    console.log("reqsCreatedByApprover: " + JSON.stringify(reqsCreatedByApprover));

    /* Splitted the code to get Item Details via a diff. api call
    if(Array.isArray(reqsCreatedByApprover) && reqsCreatedByApprover.length) {
      reqsCreatedByApprover.forEach(req => {
        //DocEntry is given an alias name ActualDocEntry, as DocNum uses the alias DocEntry
        reqDocEntries.push(req.ActualDocEntry);
      });
    }
    console.log("reqDocEntries: "+ JSON.stringify(reqDocEntries));
    //Get Row level (Item details) for all the Transfer Reqs. & then add them to the resp. Transfer Req. records
    const reqsItemDetails = dbHelper.executeWithValues(queryST.selectItemDetailsForSTs + `(${reqDocEntries})`, []);
    console.log("reqsItemDetails: "+ JSON.stringify(reqsItemDetails));
    if(Array.isArray(reqsItemDetails) && reqsItemDetails.length) {
      let fromWarehouse; //toWarehouse, 
      reqsCreatedByApprover.forEach(req => {
        itemList = [];
        reqsItemDetails.forEach(item => {
          if(req.ActualDocEntry === item.DocEntry) {
            itemList.push(item);
          }
          // if(!toWarehouse) {
          //   toWarehouse = item.WhsCode;
          // }
          if(!fromWarehouse) {
            fromWarehouse = item.FromWhsCod;
            // fromWarehouse = item.U_FromWarehouse;
          }
        });
        req.itemList = itemList;
        // req.WhsCode = toWarehouse;
        req.FromWhsCod = fromWarehouse;
      });
    }*/
    return reqsCreatedByApprover;
  } catch (err) {
    throw err;
  }
};
module.exports = { getTransferRecords, getApprovedSTRecords };
