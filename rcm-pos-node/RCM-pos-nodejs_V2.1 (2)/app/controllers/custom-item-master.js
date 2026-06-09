const helper = require("../helper/item-master.js");
/**
 * Get the list of all Items
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getItems(req.query);
    res.send(rows);
  } catch (err) {
    console.log("getInvoice - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Item Groups
 */
exports.getGroups = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));
  try {
    const results = helper.getItemGroups();
    // console.log("getGroups- controller: "+JSON.stringify(results));

    res.send(results);
  } catch (err) {
    console.log("getGroups - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Item Sub-Groups
 */
exports.getSubGroups = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params.subGroupId));
  try {
    const results = helper.getItemSubGroups(req.params.subGroupId);
    // console.log("getSubGroups- controller: "+JSON.stringify(results));

    res.send(results);
  } catch (err) {
    console.log("getSubGroups - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the current Max Sequence No.
 */
exports.getNextNo = (req, res, next) => {
  try {
    let nextNumber = 1;
    const maxNum = helper.getMaxSequenceNo();
    // If it's a valid no. increment it by `1`
    if (!isNaN(parseInt(maxNum))) {
      nextNumber = parseInt(maxNum) + 1;
    }
    // console.log("getNextNo- controller: "+JSON.stringify(results));
    res.send({ nextNumber });
  } catch (err) {
    console.log("getNextNo - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
