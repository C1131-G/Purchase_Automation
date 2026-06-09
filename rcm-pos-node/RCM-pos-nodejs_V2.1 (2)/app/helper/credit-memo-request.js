const dbHelper = require("../helper/db.js");
const { buildHeaderRecQuery, buildRowLevelQuery } = require("../utils/query.util.js");
const query = require("../config/query-credit-memo-request.js");

/**
 * Get the list of all CreditMemoRequest
 * @param {Object} req  `req.fromDate, req.toDate, req.cardCode, req.docStatus, req.searchKey,
 *                      req.pageNum, req.pageSize`
 */
exports.getCreditMemoRequest = (req) => {
  try {
    const sql = buildHeaderRecQuery(query.creditMemoQuery, req, [`T0."U_CODCntName"`]);
    console.log("getCreditMemoRequest- sql: ", sql);
    const rows = dbHelper.executeWithValues(sql);
    // console.log("getCreditMemo- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getCreditMemoRequest - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the list of Items under Credit Memo
 * @param {Object} req   `req.docNum, req.lineStatus`
 */
exports.getItemDetails = (req) => {
  try {
    const sql = buildRowLevelQuery(query.itemListForCreditMemo, req);
    const itemsList = dbHelper.executeWithValues(sql);
    console.log("getItemDetails- controller: " + JSON.stringify(itemsList));
    return { itemsList };
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

exports.getAttachmentEntry = (docEntry) => {
  try {
    const results = dbHelper.executeWithValues(query.creditMemoAttachmentEntry, [docEntry]);
    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }
    return null;
  } catch (err) {
    console.log("getAttachmentEntry - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

exports.getAttachmentPath = () => {
  try {
    const results = dbHelper.executeWithValues(query.AttachmentPath);
    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }
    return null;
  } catch (err) {
    console.log("getAttachmentEntry - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
