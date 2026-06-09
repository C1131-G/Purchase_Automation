const dbHelper = require("../helper/db");
const query = require("../config/query-numbering-series.js");

exports.getNumberingSeries = (objectCode, storeLocation) => {
  try {
    const results = dbHelper.executeWithValues(query.numberingSeries, [
      objectCode,
      storeLocation.toLowerCase(),
    ]);
    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }
    return null;
  } catch (err) {
    console.log("getNumberingSeries - Helper - error: " + JSON.stringify(err.message));
    throw err;
  }
};
