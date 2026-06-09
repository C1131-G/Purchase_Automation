const dbHelper = require("../helper/db.js");
const { buildHeaderRecQuery, buildRowLevelQuery } = require("../utils/query.util.js");
const query = require("../config/query-stock-transfer-request-new.js");

/**
 * Get the list of all StockTransferRequest
 * @param {Object} req  `req.fromDate, req.toDate, req.cardCode, req.docStatus, req.searchKey,
 *                      req.pageNum, req.pageSize`
 */
exports.getStockTransferRequest = (req) => {
  try {
    const sql = buildHeaderRecQuery(query.stockTransferRequest, req);
    console.log("getStockTransferRequest- sql: ", sql);
    const rows = dbHelper.executeWithValues(sql);
    // console.log("getStockTransferRequest- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getStockTransferRequest - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the list of Items for a passed STR
 * @param {Object} req   `req.docEntry, req.lineStatus`
 */
exports.getItemDetails = (req) => {
  try {
    const sql = buildRowLevelQuery(query.itemListForSTR, req);
    const itemsList = dbHelper.executeWithValues(sql, []);
    // console.log("getItemDetails- controller: "+JSON.stringify(itemsList));
    return { itemsList };
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
