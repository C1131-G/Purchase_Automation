const dbHelper = require("../helper/db.js");
const query = require("../config/query-misc.js");

/**
 * Get the list of Banks
 */
exports.getBanks = () => {
  try {
    const rows = dbHelper.executeWithValues(query.selectBankInfo);
    // console.log("getBanks- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getBanks - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
