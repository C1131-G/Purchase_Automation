/**
 * SAMPLE - NOT Required for POS
 */

const deliveryHelper = require("../helper/delivery.helper");
const draftHelper = require("../helper/draft.helper");
const { recordTypes } = require("../config/config");

/**
 * Get the list of Deliveries were the current Cust. Ref# is used
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    let rows = [];
    if (req.query.customerRefNo) {
      //Get all Deliveries based on Customer Ref#
      rows = deliveryHelper.getDeliveryWithCustomerRefNo(req.query.customerRefNo);
    } else if (req.query.userRole) {
      rows = deliveryHelper.getDeliveryRecords(req.query);
    }
    res.send(rows);
  } catch (err) {
    console.log("get - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items from a Delivery
 */
exports.getItems = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));
  try {
    let items;
    if (req.params.recordType === recordTypes.DIRECT) {
      items = deliveryHelper.getItemDetails(req.query.docNum);
    } else if (req.params.recordType === recordTypes.DRAFT) {
      items = draftHelper.getDraftItems(req.query.docEntry);
    }
    console.log("Delivery - getItems- controller: " + JSON.stringify(items));
    res.send(items);
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items of Delivery
 */
exports.getTax = (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));
  try {
    let items;
    if (req.params.recordType === recordTypes.DIRECT) {
      items = deliveryHelper.getTaxDetails(req.query.docNum);
    } else if (req.params.recordType === recordTypes.DRAFT) {
      items = draftHelper.getDraftTax(req.query.docEntry);
    }
    // console.log("Delivery - getItems- controller: "+JSON.stringify(items));
    res.send(items);
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
