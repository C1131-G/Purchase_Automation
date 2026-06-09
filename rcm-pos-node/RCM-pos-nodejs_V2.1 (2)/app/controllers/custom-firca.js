const { enableFircaIntegration } = require("../config/config.js");
const { submitInvoicetoFirca } = require("../helper/invoice-to-firca.js");
const { getFircaQRCodeDataURI, getUDFData, updateReprint } = require("../helper/invoice.js");

/**
 * Get the list of all invoices
 */
exports.createFirca = async (req, res, next) => {
  try {
    if (req.body.invoice) {
      let response = {};
      const request = req.body.invoice;
      console.log("req.query" + JSON.stringify(req.body.invoice));
      const companyCode = request.CompanyCode ? request.CompanyCode : "";
      const docEntry = request.DocEntry ? request.DocEntry : "";
      const docNum = request.DocNum ? request.DocNum : "";

      if (enableFircaIntegration) {
        // Submit the invoice to firca.
        let isInvoiceSubmitted = await submitInvoicetoFirca(docEntry, companyCode, "Invoice");
        if (isInvoiceSubmitted) {
          const qrCodeDataURI = await getFircaQRCodeDataURI(docNum);
          console.log("qrCodeDataURI", qrCodeDataURI);
          response.qrCode = qrCodeDataURI;
        }
      }
      const responseUDFData = await getUDFData(docNum);
      if (responseUDFData) {
        response.InvCount = responseUDFData.U_InvCount;
        response.SDCTime = responseUDFData.U_SDCTime;
        response.SDCInvNum = responseUDFData.U_SDCInvNum;
        response.VehicleNo = responseUDFData.U_VehicleNo;

        const reprint = updateReprint(docEntry);
        if (reprint) {
          console.log("Reprint Updated Successfully!");
        }
      }
      // if (docEntry) {
      //     const timItems = getTimberItemDetails(docEntry);
      //     response.timItemList = timItems;
      // }
      res.status(200).send(response);
    } else {
      res.status(400).send({ message: "Invalid Request. Missing 'Firca' property!" });
    }
  } catch (err) {
    console.log("create Invoice: " + JSON.stringify(err));
    next(err);
  }
};
