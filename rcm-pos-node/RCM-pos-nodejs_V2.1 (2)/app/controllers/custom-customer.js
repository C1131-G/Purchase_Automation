const {
  getCustomerInfo,
  getCustomerAddress,
  getCustomerContactPerson,
  getCustomerSpecialPrice,
} = require("../helper/customer");

/**
 * Get Customer Info
 */
exports.get = (req, res, next) => {
  console.log("*** getCustomerInfo - req.query: " + JSON.stringify(req.query));
  try {
    const rows = getCustomerInfo(req.query);
    console.log("getCustomerInfo %s", JSON.stringify(rows));
    res.send(rows);
  } catch (err) {
    console.log("getCustomerInfo - controller - error: " + JSON.stringify(err));
    // let message = "Something went wrong. Please try again or contact your administrator"
    // if(err.message)
    //   message = err.message;
    // res.status(500).send({ message });
    next(err);
  }
};

/**
 * Get Customer Address
 */
exports.getAddress = (req, res, next) => {
  console.log("*** getAddress - req.params: " + JSON.stringify(req.params));
  try {
    const rows = getCustomerAddress(req.params.cardCode);
    // console.log("getAddress %s", JSON.stringify(rows));
    res.send(rows);
  } catch (err) {
    console.log("getAddress - controller - error: " + JSON.stringify(err));
    next(err);
  }
};

/**
 * Get Customer Contact Person
 */
exports.getContactPerson = (req, res, next) => {
  console.log("*** getContactPerson - req.params: " + JSON.stringify(req.params));
  try {
    const rows = getCustomerContactPerson(req.params.cardCode);
    console.log("getContactPerson %s", JSON.stringify(rows));
    res.send(rows);
  } catch (err) {
    console.log("getContactPerson - controller - error: " + JSON.stringify(err));
    next(err);
  }
};

/**
 * Get Customer Contact Person
 */
exports.getSpecialPrice = (req, res, next) => {
  console.log("*** getSpecialPrice - req.params: " + JSON.stringify(req.params));
  console.log("*** getSpecialPrice - req.query: " + JSON.stringify(req.query));
  try {
    const rows = getCustomerSpecialPrice(
      req.params.cardCode,
      req.query.itemCode,
      req.query.warehouseCode,
    );
    console.log("getSpecialPrice %s", JSON.stringify(rows));
    res.send(rows);
  } catch (err) {
    console.log("getSpecialPrice - controller - error: " + JSON.stringify(err));
    next(err);
  }
};
