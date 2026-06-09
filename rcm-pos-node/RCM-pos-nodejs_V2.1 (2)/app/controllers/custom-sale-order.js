const helper = require("../helper/sale-order.js");
/**
 * Get the list of all Sale Orders
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getSaleOrders(req.query);
    res.send(rows);
  } catch (err) {
    console.log("get - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items for a passed Sale Order number
 */
exports.getItems = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));
  try {
    const results = helper.getItemDetails(req.query);
    console.log("getItems- controller: " + JSON.stringify(results));

    res.send(results);
  } catch (err) {
    console.log("getItems - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
