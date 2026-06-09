const helper = require("../helper/users.js");
/**
 * Get the Sales Employee Code for a given User
 */
exports.getSalesEmployee = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getSalesEmployeeForUser(req.query.userId);
    res.send(rows);
  } catch (err) {
    console.log("get Tax - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
