const helper = require("../helper/credit-memo.js");
/**
 * Get the list of all CreditMemo
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getCreditMemo(req.query);
    res.send(rows);
  } catch (err) {
    console.log("get CreditMemo - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items under a CreditMemo
 */
exports.getItems = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));
  try {
    const results = helper.getItemDetails(req.query);
    console.log("getItems-CreditMemo controller: " + JSON.stringify(results));

    res.send(results);
  } catch (err) {
    console.log("getItems - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
