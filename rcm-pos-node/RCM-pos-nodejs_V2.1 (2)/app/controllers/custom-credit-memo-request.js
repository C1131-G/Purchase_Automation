const helper = require("../helper/credit-memo-request.js");
/**
 * Get the list of all CreditMemoRequest
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getCreditMemoRequest(req.query);
    res.send(rows);
  } catch (err) {
    console.log("get CreditMemoRequest - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items under a CreditMemoRequest
 */
exports.getItems = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));
  try {
    const results = helper.getItemDetails(req.query);
    console.log("getItems-CreditMemoRequest controller: " + JSON.stringify(results));

    res.send(results);
  } catch (err) {
    console.log("getItems - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
