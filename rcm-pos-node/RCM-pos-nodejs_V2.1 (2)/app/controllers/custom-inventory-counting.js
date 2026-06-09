const helper = require("../helper/inventory-counting.js");
/**
 * Get the list of all InventoryCounting
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getInventoryCounting(req.query);
    res.send(rows);
  } catch (err) {
    console.log("get - InventoryCounting - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items under an InventoryCounting
 */
exports.getItems = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));
  try {
    const results = helper.getItemDetails(req.query);
    // console.log("getItems- controller: "+JSON.stringify(results));

    res.send(results);
  } catch (err) {
    console.log(
      "getItems - InventoryCounting - controller - error: " + JSON.stringify(err.message),
    );
    next(err);
  }
};
