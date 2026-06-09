const dbHelper = require("../helper/db");
const query = require("../config/query-credit-card.js");

/**
 * Get the list of all Credit Cards
 */
exports.getCreditCards = () => {
  try {
    const rows = dbHelper.executeWithValues(query.creditCards);
    // console.log("getCreditCards- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getCreditCards - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
