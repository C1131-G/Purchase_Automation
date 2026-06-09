const dbHelper = require("../helper/db.js");
const { buildHeaderRecQuery, buildRowLevelQuery } = require("../utils/query.util.js");
const query = require("../config/query-inventory-counting.js");

/**
 * Get the list of all InventoryCounting
 * @param {Object} req  `req.fromDate, req.toDate, req.cardCode, req.docStatus, req.searchKey,
 *                      req.pageNum, req.pageSize`
 */
exports.getInventoryCounting = (req) => {
  try {
    const sql = buildHeaderRecQuery(query.inventoryCounting, req, null, "CountDate");
    console.log("getInventoryCounting- sql: ", sql);
    const rows = dbHelper.executeWithValues(sql, [req.counterId]);
    // console.log("getInventoryCounting- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getInventoryCounting - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the list of Items for a passed InventoryCounting
 * @param {Object} req   `req.docNum, req.counterId`
 */
exports.getItemDetails = (req) => {
  try {
    // const sql = buildRowLevelQuery(query.itemListForInventoryCounting, req);
    // const itemsList = dbHelper.executeWithValues(sql, []);

    const itemsList = dbHelper.executeWithValues(query.itemListForInventoryCounting, [
      req.docNum,
      req.counterId,
    ]);
    // console.log("getItemDetails- controller: "+JSON.stringify(itemsList));
    return { itemsList };
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
