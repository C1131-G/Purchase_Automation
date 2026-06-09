const { getSLConnection } = require("../helper/service-layer-login.js");
const serviceLayerHelper = require("../helper/service-layer-invoice.js");
const serviceLayerIPHelper = require("../helper/service-layer-incoming-payment.js");
const serviceLayerSBSHelper = require("../helper/service-layer-sales-batch-selection.js");
const serviceLayerJEHelper = require("../helper/service-layer-journal-entry.js");
const cashDenominationService = require("../entities/services/cash-denominations.service.js");
const { formatDate } = require("../utils/utils.js");
const {
  trxTypes,
  defaultBranchId,
  fircaIntegrationWaitTime,
  enableFircaIntegration,
  objectCodes,
  portalModules,
  enableStoreBasedNumbering,
  isHomeDeliveryEnabled,
} = require("../config/config.js");
const { submitInvoicetoFirca } = require("../helper/invoice-to-firca.js");
const {
  getFircaQRCodeDataURI,
  getUDFData,
  updateSalesBatchSelection,
  updateTransRef,
  getUniqueId,
} = require("../helper/invoice.js");
const { getNumberingSeries } = require("../helper/numbering-series.js");
const { getItemDetails, getTimberItemDetails } = require("../helper/invoice.js");

const create = async (req, res, next) => {
  try {
    if (req.body.invoice) {
      let response = {};
      let ipDocEntry = "";
      let uniqueData = {};
      const cookie = await getSLConnection(req);
      let generateDeliveryCode;

      const request = req.body.invoice;
      const companyCode = request.CompanyCode ? request.CompanyCode : "";

      if (isHomeDeliveryEnabled && request.U_IsHomeDelivery === "Y") {
        generateDeliveryCode = Math.floor(100000 + Math.random() * 900000);
        request.U_DeliveryCode = generateDeliveryCode;
      }

      if (enableStoreBasedNumbering) {
        // Get Numbering Series.
        let seriesResponse = await getNumberingSeries(
          objectCodes[portalModules.INVOICE],
          req.session.userSessionLog.storeLocation,
        );
        if (seriesResponse) {
          console.log("seriesResponse series:", seriesResponse.Series);
          request.Series = seriesResponse.Series;
        }
      }

      const invoiceResponse = await serviceLayerHelper.createInvoice(request, cookie);

      // Create Incoming Payment when a payment is done via Card or CC.
      if (invoiceResponse.DocEntry) {
        response.DocNum = invoiceResponse.DocNum;
        response.DocEntry = invoiceResponse.DocEntry;
        response.isExist = false;

        if (req.body.incomingPayment) {
          if (enableStoreBasedNumbering) {
            // Get Numbering Series for Incoming Payment.
            let seriesResponse = await getNumberingSeries(
              objectCodes[portalModules.INCOMING_PAYMENT],
              req.session.userSessionLog.storeLocation,
            );
            if (seriesResponse) {
              console.log("seriesResponse series:", seriesResponse.Series);
              req.body.incomingPayment.Series = seriesResponse.Series;
            }
          }
          const ipResponse = await processPayment(
            invoiceResponse.DocEntry,
            req.body.incomingPayment,
            cookie,
          );
          if (ipResponse) {
            response.IncomingPaymentDocNum = ipResponse.DocNum;
            ipDocEntry = ipResponse.DocEntry;

            if (req.body?.journalEntry) {
              const journalResponse = await processJournalEntry(
                req.body.journalEntry,
                invoiceResponse.DocNum,
                ipResponse.DocNum,
                cookie,
              );
              response.JournalEntryDocNum = journalResponse?.JdtNum;
            }
          }
        }

        // --- FIRCA INTEGRATION START ---
        if (enableFircaIntegration) {
          // Submit the invoice to firca.
          let isInvoiceSubmitted = await submitInvoicetoFirca(
            invoiceResponse.DocEntry,
            companyCode,
            "Invoice",
          );
          if (isInvoiceSubmitted) {
            const qrCodeDataURI = await getFircaQRCodeDataURI(invoiceResponse.DocNum);
            console.log("qrCodeDataURI", qrCodeDataURI);
            response.qrCode = qrCodeDataURI;
          }
        }
        // --- FIRCA INTEGRATION END ---

        const responseUDFData = await getUDFData(invoiceResponse.DocNum);
        if (responseUDFData) {
          response.InvCount = responseUDFData.U_InvCount;
          response.SDCTime = responseUDFData.U_SDCTime;
          response.SDCInvNum = responseUDFData.U_SDCInvNum;
          response.VehicleNo = responseUDFData.U_VehicleNo;
        }
      }

      console.log("*************invoiceSalesBatchResponse start************ ");
      if (req.body.salesBatchSelection && req.body.salesBatchSelection.length > 0) {
        const responseSBS = await createSalesBatchSelection(
          response.DocEntry,
          response.DocNum,
          req.body.salesBatchSelection,
          cookie,
        );
        console.log("*************invoiceSalesBatchResponse************: ", responseSBS);
      }
      console.log("*************invoiceSalesBatchResponse end************ ");

      if (req.body.invoice.U_PaymentType === "Card") {
        console.log("*************CreditCard Management reference start************ ");
        if (
          req.body.incomingPayment?.TransferReference &&
          req.body.incomingPayment?.TransferReference !== ""
        ) {
          console.log(
            "*************CreditCard Management reference************: ",
            ipDocEntry + " - " + req.body.incomingPayment.TransferReference,
          );
          const responseTransRef = await updateTransRef(
            ipDocEntry,
            req.body.incomingPayment?.TransferReference,
          );
          console.log(
            "*************CreditCard Management reference************: ",
            responseTransRef,
          );
        }
        console.log("*************CreditCard Management reference end************ ");
      }

      if (response.DocNum) {
        const itemDetails = await getItemDetails({ docNum: response.DocNum });
        response.itemList = itemDetails;
      }

      res.status(200).send(response);
    } else {
      res.status(400).send({ message: "Invalid Request. Missing 'invoice' property!" });
    }
  } catch (error) {
    console.log("create Invoice error: " + JSON.stringify(error));
    next(error);
  }
};

/**
 * Create Incoming Payment
 */
const processPayment = async (invoiceDocEntry, ipRequest, cookie) => {
  try {
    ipRequest.PaymentInvoices[0].DocEntry = invoiceDocEntry;
    if (Array.isArray(ipRequest.PaymentChecks) && ipRequest.PaymentChecks.length > 0) {
      ipRequest.PaymentChecks[0].DueDate = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
    }
    const ipResponse = await serviceLayerIPHelper.createIncomingPayment(ipRequest, cookie);
    return ipResponse;
  } catch (err) {
    throw err;
  }
};

/**
 * Create Journal Entry
 */
const processJournalEntry = async (request, invoiceDocNum, ipDocNum, cookie) => {
  const today = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");

  try {
    request.Reference = invoiceDocNum;
    request.Reference2 = ipDocNum;
    request.TaxDate = today;
    request.DueDate = today;
    request.ReferenceDate = today;

    const jeResponse = await serviceLayerJEHelper.createJournalEntry(request, cookie);
    return jeResponse;
  } catch (err) {
    throw err;
  }
};

const createSalesBatchSelection = async (invoiceDocEntry, invoiceDocNum, sbsRequest, cookie) => {
  try {
    let docNum = [];
    console.log("********* createSalesBatchSelection ****request: ", sbsRequest);
    const response = await serviceLayerSBSHelper.createSalesBatchSelection(
      sbsRequest,
      invoiceDocEntry,
      invoiceDocNum,
      cookie,
    );

    if (response && response.length > 0) {
      for (const item of response) {
        await updateSalesBatchSelection(item, invoiceDocEntry);
      }
      docNum.push(response.DocNum);
    }
    return docNum;
  } catch (error) {
    console.log("createSalesBatchSelection error: " + JSON.stringify(error));
    throw error;
  }
};

const update = async (req, res, next) => {
  try {
    if (req.body) {
      let response = {};
      const cookie = await getSLConnection(req);

      const request = req.body;
      request.U_DeliveryStatus = request.U_DeliveryStatus || "DELIVERED";
      request.U_IsPaymentReceived = request.U_IsPaymentReceived || "Y";

      console.log("*************request update: ", request);
      const invoiceResponse = await serviceLayerHelper.updateInvoice(request, cookie);

      if (!invoiceResponse || invoiceResponse.status === 200 || invoiceResponse.DocEntry) {
        response.DocNum = request.DocNum;
        response.DocEntry = request.DocEntry;
        response.message = invoiceResponse.message;
        const attachRes = await updateAttach(req, cookie);
        if (attachRes) {
          console.log("Attachment updated");
        }
      }
      res.status(200).send(response);
    } else {
      res.status(400).send({ message: "Invalid Request. Missing body content!" });
    }
  } catch (error) {
    console.log("update Invoice error: " + JSON.stringify(error));
    next(error);
  }
};

const updateAttach = async (req, cookie) => {
  try {
    let attchResponse = {};
    console.log("attachment request body data: ", JSON.stringify(req.body));
    attchResponse = await serviceLayerHelper.updateInvoiceAttachment(req, cookie);
    console.log("attachment Response: ", attchResponse);
    return attchResponse;
  } catch (error) {
    console.log("updateAttach error: " + JSON.stringify(error));
  }
};

module.exports = { create, update, updateAttach };
