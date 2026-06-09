const helper = require("../helper/payment-terms.js");
/**
 * Get the list of all PT
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getPaymentTerms();
    res.send(rows);
  } catch (err) {
    console.log("get Tax - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
