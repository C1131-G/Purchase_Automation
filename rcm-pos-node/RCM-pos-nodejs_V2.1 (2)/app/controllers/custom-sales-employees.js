const helper = require("../helper/sales-exployees.js");
/**
 * Get the list of all Sales Employees
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    let userCode, storeLocation;
    userCode = req.query.userCode ?? "";
    storeLocation = req.query.storeLocation ?? "";
    let rows = [];
    rows = helper.getSalesEmployees(storeLocation, userCode);
    if (Array.isArray(rows) && rows.length === 0) {
      rows = helper.getSalesEmployees(storeLocation, ""); // try without userCode filter
    }
    res.send(rows);
  } catch (err) {
    console.log("get Tax - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
