const helper = require("../helper/locations.js");
/**
 * Get the list of all Locations
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getLocations();
    res.send(rows);
  } catch (err) {
    console.log("get Locations - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
