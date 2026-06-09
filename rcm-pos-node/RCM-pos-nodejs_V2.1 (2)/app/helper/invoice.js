// /helper/invoice.js

const dbHelper = require("../helper/db");
const { buildHeaderRecQuery, buildRowLevelQuery } = require("../utils/query.util.js");
const query = require("../config/query-invoice.js");
const { getQRCodeDataURI } = require("../utils/qr-code.util.js");

// INTEGRATION IMPORTS
const { serviceLayerAPI } = require("../config/service-layer-api");
const { getSLConnection } = require("./service-layer-login.js"); // ADDED THIS IMPORT

/**
 * Fetch Invoice details from SAP Service Layer
 */
exports.getInvoiceByDocEntry = async (docEntry, req = null) => {
  try {
    if (!docEntry && docEntry !== 0) {
      throw new Error("Invalid docEntry passed to getInvoiceByDocEntry");
    }

    // 1. Get a valid Session Cookie (This fixes the 401 error)
    const cookie = await getSLConnection(req);
    if (!cookie) throw new Error("Could not retrieve Service Layer Session Cookie");

    console.log(`[Invoice Helper] Checking status for DocEntry: ${docEntry}`);

    // 2. Perform the GET call with the Cookie attached to the headers
    const response = await serviceLayerAPI.get(`/Invoices(${docEntry})`, {
      headers: {
        Cookie: cookie,
      },
    });

    return response.data;
  } catch (err) {
    // Log detailed error from SAP if available
    const sapError = err.response?.data?.error?.message?.value || err.message;
    console.log("getInvoiceByDocEntry - SL Error:", sapError);
    throw new Error(sapError);
  }
};

/**
 * Get the list of all Invoices from local DB
 */
exports.getInvoices = (req) => {
  try {
    const sql = buildHeaderRecQuery(query.invoice, req, [`T0."U_CODCntName"`]);
    return dbHelper.executeWithValues(sql);
  } catch (err) {
    console.log("getInvoices - error: " + err.message);
    throw err;
  }
};

/**
 * Get the list of Items under an Invoice
 */
exports.getItemDetails = (req) => {
  try {
    const sql = buildRowLevelQuery(query.itemListForInvoice, req);
    const itemsList = dbHelper.executeWithValues(sql, []);
    return { itemsList };
  } catch (err) {
    console.log("getItemDetails - error: " + err.message);
    throw err;
  }
};

/**
 * Get the list of Timber Items under an Invoice
 */
// exports.getTimberItemDetails = (docEntry) => {
//   try {
//     const sql = query.getTimberItems;
//     const itemsList = dbHelper.executeWithValues(sql, [docEntry]);
//     return { itemsList };
//   }
//   catch (err) {
//     console.log("getTimberItemDetails - error: "+ err.message);
//     throw err;
//   }
// }

exports.getAttachmentEntry = (docEntry) => {
  try {
    const results = dbHelper.executeWithValues(query.invoiceAttachmentEntry, [docEntry]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  } catch (err) {
    console.log("getAttachmentEntry - error: " + err.message);
    throw err;
  }
};

/**
 * Updates Remaining Qty in the Invoice Rows
 */
exports.updateRemainingQuantity = (req) => {
  try {
    if (Array.isArray(req) && req.length > 0) {
      const updateRequest = req.map((item) => {
        return [item.U_ReturnedQty, item.U_RemainingOpenQty, item.DocEntry, item.LineNum];
      });
      return dbHelper.executeBatchInsertUpdate(query.updateInvoiceItem, updateRequest);
    }
    return null;
  } catch (err) {
    console.log("updateRemainingQuantity - error: " + err.message);
    throw err;
  }
};

// FIRCA and UDF Helpers
exports.getFircaInfo = (docNum) => {
  try {
    const results = dbHelper.executeWithValues(query.invoiceFircaURL, [docNum]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  } catch (err) {
    throw err;
  }
};
exports.getDeliveryInfo = (docNum) => {
  try {
    const results = dbHelper.executeWithValues(query.invoiceDeliveyCodeData, [docNum]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  } catch (err) {
    throw err;
  }
};
exports.getUDFInfo = (docNum) => {
  try {
    const results = dbHelper.executeWithValues(query.invoiceUDFData, [docNum]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  } catch (err) {
    throw err;
  }
};
exports.updateTransRef = (ipDocEntry, referenece) => {
  try {
    return dbHelper.executeWithValues(query.updateTransRef, [referenece, ipDocEntry]);
  } catch (err) {
    throw err;
  }
};
exports.getFircaQRCodeDataURI = async (docNum) => {
  try {
    const results = this.getFircaInfo(docNum);
    let qrCodeBase64;
    if (results && results.U_VerifyURL) {
      qrCodeBase64 = await getQRCodeDataURI(results.U_VerifyURL);
    }
    return qrCodeBase64;
  } catch (err) {
    throw err;
  }
};
exports.getDeliveryCode = async (docNum) => {
  try {
    return this.getDeliveryInfo(docNum);
  } catch (err) {
    throw err;
  }
};
exports.getUDFData = async (docNum) => {
  try {
    return this.getUDFInfo(docNum);
  } catch (err) {
    throw err;
  }
};
exports.updateReprint = (docEntry) => {
  try {
    if (docEntry) {
      dbHelper.executeWithValues(query.updateInvoiceReprintStatus, [docEntry]);
      return true;
    }
    return null;
  } catch (err) {
    throw err;
  }
};
exports.updateInvoiceReprintStatus = (docEntry) => {
  try {
    dbHelper.executeWithValues(query.updateInvoiceReprintStatus, [docEntry]);
    return true;
  } catch (err) {
    throw err;
  }
};
exports.updateSalesBatchSelection = (item, docEntry) => {
  try {
    if (item) {
      dbHelper.executeWithValues(query.updateSalesBatchSelectionDocNum, [
        item.DocNum,
        docEntry,
        item.U_ItemCode,
      ]);
      return true;
    }
    return null;
  } catch (err) {
    throw err;
  }
};
exports.getUniqueId = (uniqueId) => {
  try {
    const results = dbHelper.executeWithValues(query.getUniqueId, [uniqueId]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  } catch (err) {
    throw err;
  }
};
