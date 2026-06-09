const helper = require("../helper/tax");
/**
 * Get the list of all Active Tax Definition
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getTaxDefinition();
    res.send(rows);
  } catch (err) {
    console.log("get Tax - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
