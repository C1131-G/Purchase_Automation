const axios = require("axios");

/**
 * Gets the QR Code from the `url` provided
 * @param {*} url
 * @returns QR Code as Base64 Data URI
 */
exports.submitInvoicetoFirca = async (docEntry, companyCode, transType) => {
  try {
    let FIRCA_URL = "";
    if (transType == "Invoice") {
      FIRCA_URL = process.env.FIRCA_API_BASE_URL + "/" + process.env.FIRCA_INVOICE_URI;
    } else {
      FIRCA_URL = process.env.FIRCA_API_BASE_URL + "/" + process.env.FIRCA_SALES_QUOTATION_URI;
    }
    const data = {
      DocEntry: docEntry,
      CompanyCode: companyCode,
    };
    const response = await axios.post(FIRCA_URL, data, {
      auth: {
        username: process.env.FIRCA_USERNAME,
        password: process.env.FIRCA_PASSWORD,
      },
    });

    console.log("submitInvoicetoFirca - response: " + JSON.stringify(response.data));
    if (response.data.statusCode === 1) {
      return true;
    }
    return false;
  } catch (err) {
    throw err;
  }
};
