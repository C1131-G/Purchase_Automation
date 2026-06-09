const dbHelper = require("../helper/db.js");
const { buildHeaderRecQuery, buildRowLevelQuery } = require("../utils/query.util.js");
const query = require("../config/query-credit-memo.js");

/**
 * Get the list of all Credit Memo
 * @param {Object} req  `req.fromDate, req.toDate, req.cardCode, req.docStatus, req.searchKey,
 *                      req.pageNum, req.pageSize`
 */
exports.getCreditMemo = (req) => {
  try {
    const sql = buildHeaderRecQuery(query.creditMemoQuery, req);
    console.log("getCreditMemo- sql: ", sql);
    const rows = dbHelper.executeWithValues(sql);
    // console.log("getCreditMemo- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getCreditMemo - controller - error: " + JSON.stringify(err.message));
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
