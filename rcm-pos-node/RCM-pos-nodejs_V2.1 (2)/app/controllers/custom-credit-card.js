const { enableLocationBasedCreditCardAccount } = require("../config/config.js");
const helper = require("../helper/credit-card.js");
const { getLocationDefaults } = require("../helper/locations.js");

/**
 * Get the list of all CCs
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getCreditCards();
    if (enableLocationBasedCreditCardAccount && req.query.location) {
      const locationBasedAccount = getLocationDefaults(req.query.location);
      // console.log("locationBasedAccount: ", locationBasedAccount);
      if (rows && Array.isArray(locationBasedAccount) && locationBasedAccount.length > 0) {
        rows.forEach((card) => {
          // Replace the Card's AccountCode with the Location's AccountCode
          card.AcctCode = locationBasedAccount[0].AccountCode;
        });
      }
    }
    res.send(rows);
  } catch (err) {
    console.log("Credit Card - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
