const dbHelper = require("../helper/db");
const { buildHeaderRecQuery, buildRowLevelQuery } = require("../utils/query.util.js");
const query = require("../config/query-sale-order.js");

/**
 * Get the list of all Sale Orders
 * @param {Object} req  `req.fromDate, req.toDate, req.cardCode, req.docStatus, req.searchKey,
 *                      req.pageNum, req.pageSize`
 */
exports.getSaleOrders = (req) => {
  try {
    const sql = buildHeaderRecQuery(query.saleOrderQuery, req);
    console.log("getSalesQuotation- sql: ", sql);
    const rows = dbHelper.executeWithValues(sql);
    // console.log("getSalesQuotation- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getSaleOrders - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the list of Items for a passed Sale Order number
 * @param {Object} req   req.docNum, req.lineStatus
 */
exports.getItemDetails = (req) => {
  try {
    const sql = buildRowLevelQuery(query.itemListForSaleOrder, req);
    const itemsList = dbHelper.executeWithValues(sql);
    const freightInfo = dbHelper.executeWithValues(query.freightInfo + `(${docNum})`, []);
    console.log("getItemDetails- controller: " + JSON.stringify(itemsList));
    return { itemsList, freightInfo };
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
