const helper = require("../helper/warehouse.js");
/**
 * Get all the Warehouses (optionally based on the BranchId or LocationCode)
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getWarehouses(req.query);
    res.send(rows);
  } catch (err) {
    console.log("get WHs - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
