const dbHelper = require("../helper/db.js");
const query = require("../config/query-misc.js");

/**
 * Get the list of Payment Terms
 */
exports.getPaymentTerms = () => {
  try {
    const rows = dbHelper.executeWithValues(query.selectPaymentTerms);
    // console.log("getPaymentTerms- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getPaymentTerms - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
