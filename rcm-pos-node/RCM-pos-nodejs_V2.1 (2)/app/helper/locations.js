const dbHelper = require("../helper/db.js");
const query = require("../config/query-location.js");

/**
 * Get the list of Locations
 */
exports.getLocations = () => {
  try {
    const rows = dbHelper.executeWithValues(query.selectLocations);
    // console.log("getLocations- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getLocations - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the Location Based Card AccountCode, COD, OTC CardCodes...
 */
exports.getLocationDefaults = (location) => {
  try {
    const rows = dbHelper.executeWithValues(query.locationDefaults, [location]);
    console.log("getLocationDefaults- rows: " + JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getLocationDefaults - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
