const axios = require("axios");

/**
 * Gets the QR Code from the `url` provided
 * @param {*} url
 * @returns QR Code as Base64 Data URI
 */
exports.getQRCodeDataURI = async (url) => {
  try {
    const qrCodeGeneratorURI = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=";
    const response = await axios.get(`${qrCodeGeneratorURI}${encodeURIComponent(url)}`, {
      responseType: "arraybuffer",
    });

    // console.log("getQRCode - response: "+JSON.stringify(response.data));

    // Convert the image data to base64
    const qrCodeBase64 = Buffer.from(response.data, "binary").toString("base64");
    // console.log("getQRCode - qrCodeBase64: "+JSON.stringify(qrCodeBase64));
    // return qrCodeBase64;

    // Return the value as base64 data URI string
    return `data:image/png;base64,${qrCodeBase64}`;
  } catch (err) {
    throw err;
  }
};
