const helper = require("../helper/invoice.js");
/**
 * Get the list of all invoices
 */
exports.get = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = helper.getInvoices(req.query);
    res.send(rows);
  } catch (err) {
    console.log("getInvoice - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of all invoices
 */
exports.updateReprint = (req, res, next) => {
  console.log("req.query" + JSON.stringify(req.query));
  const { DocEntry, U_IsReprinted } = req.body;
  try {
    const rows = helper.updateInvoiceReprintStatus(DocEntry, U_IsReprinted);
    res.send({ message: "Invoice Reprint Status Updated Successfully", success: true });
  } catch (err) {
    console.log("getInvoice - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items under an Invoice
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

/**
 * Get the list of Items under an Invoice
 */
exports.getFircaQRCode = async (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  try {
    const qrCodeDataURI = await helper.getFircaQRCodeDataURI(req.query.docNum);
    // console.log("getFircaCode - qrCodeDataURI: "+JSON.stringify(qrCodeDataURI));
    res.send(qrCodeDataURI);
  } catch (err) {
    console.log("getFircaCode - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items under an Invoice
 */
exports.getDeliveryCode = async (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.query));
  try {
    const response = await helper.getDeliveryCode(req.query.docNum);
    console.log("getDeliveryCode - Response: " + JSON.stringify(response));
    res.send({ DeliveryCode: response.DeliveryCode });
  } catch (err) {
    console.log("getDeliveryCode - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};

/**
 * Get the list of Items under an Invoice
 */
exports.checkDeliveryConfirmation = async (req, res, next) => {
  console.log("req.query: " + JSON.stringify(req.body));
  try {
    let isValid = false;
    const response = await helper.getDeliveryCode(req.body.docNum);
    console.log("checkDeliveryConfirmation - Response: " + JSON.stringify(response));
    if (req.body.DeliveryCode === response.DeliveryCode) {
      isValid = true;
    }
    res.send({ isValid });
  } catch (err) {
    console.log("checkDeliveryConfirmation - controller - error: " + JSON.stringify(err.message));
    next(err);
  }
};
