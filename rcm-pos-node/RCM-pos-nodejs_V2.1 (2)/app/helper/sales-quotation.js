const dbHelper = require("../helper/db.js");
const { buildHeaderRecQuery, buildRowLevelQuery } = require("../utils/query.util.js");
const query = require("../config/query-sales-quotation.js");

/**
 * Get the list of all Sales Quotation
 * @param {Object} req  `req.fromDate, req.toDate, req.cardCode, req.docStatus, req.searchKey,
 *                      req.pageNum, req.pageSize`
 */
exports.getSalesQuotation = (req) => {
  try {
    const sql = buildHeaderRecQuery(query.salesQuotationQuery, req);
    console.log("getSalesQuotation- sql: ", sql);
    const rows = dbHelper.executeWithValues(sql);
    // console.log("getSalesQuotation- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getSalesQuotation - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the list of Items for a passed Sales Quotation
 * @param {Object} req   `req.docNum, req.lineStatus`
 */
exports.getItemDetails = (req) => {
  try {
    const sql = buildRowLevelQuery(query.itemListForSalesQuotation, req);
    const itemsList = dbHelper.executeWithValues(sql, []);
    // console.log("getItemDetails- controller: "+JSON.stringify(itemsList));
    return { itemsList };
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

exports.updateSQSalesBatchSelection = (item, docEntry) => {
  try {
    console.log("updateSQSalesBatchSelection %s", item.DocNum, docEntry, item.U_ItemCode);
    if (item) {
      const rows = dbHelper.executeWithValues(query.updateSQSalesBatchSelectionDocNum, [
        item.DocNum,
        docEntry,
        item.U_ItemCode,
      ]);
      console.log("updateSQSalesBatchSelection %s", JSON.stringify(rows));
      return true;
    }
    return null;
  } catch (err) {
    console.log("updateSQSalesBatchSelection - helper - error: " + JSON.stringify(err.message));
    throw err;
  }
};
