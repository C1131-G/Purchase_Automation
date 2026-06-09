const helper = require("../helper/sales-quotation.js");
/**
 * Get the list of all Sales Quotation
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getSalesQuotation(req.query);
    res.send(rows);
  } catch (err) {
    console.log("getSalesQuotation - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items under a Sales Quotation
 */
exports.getItems = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));
  try {
    const results = helper.getItemDetails(req.query);
    // console.log("getItems- controller: "+JSON.stringify(results));

    res.send(results);
  } catch (err) {
    console.log("getItems - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
