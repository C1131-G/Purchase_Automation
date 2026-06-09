const helper = require("../helper/banks.js");
/**
 * Get the list of all Banks
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getBanks();
    res.send(rows);
  } catch (err) {
    console.log("get Banks - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
