const dbHelper = require("../helper/db");
const query = require("../config/query-misc");

/**
 * Get the list of Active Taxes & their Rates
 */
exports.getTaxDefinition = () => {
  try {
    const rows = dbHelper.executeWithValues(query.selectTaxInfo);
    // console.log("getTaxDefinition- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getTaxDefinition - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
