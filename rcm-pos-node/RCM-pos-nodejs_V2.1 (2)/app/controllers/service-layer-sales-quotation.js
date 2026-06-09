const { getSLConnection } = require("../helper/service-layer-login");
const serviceLayerHelper = require("../helper/service-layer-sales-quotation");
const serviceLayerSBSHelper = require("../helper/service-layer-sales-batch-selection");
const {
  enableFircaIntegration,
  objectCodes,
  portalModules,
  enableStoreBasedNumbering,
} = require("../config/config.js");
const { submitInvoicetoFirca } = require("../helper/invoice-to-firca.js");
const { updateSQSalesBatchSelection } = require("../helper/sales-quotation.js");
const { getNumberingSeries } = require("../helper/numbering-series.js");

const create = async (req, res, next) => {
  try {
    let docNum = "";
    const companyCode = req.body.CompanyCode ? req.body.CompanyCode : "";
    if (enableStoreBasedNumbering) {
      // Get Numbering Series.
      let seriesResponse = await getNumberingSeries(
        objectCodes[portalModules.SALES_QUOTATION],
        req.session.userSessionLog.storeLocation,
      );
      if (seriesResponse) {
        console.log("seriesResponse series:", seriesResponse.Series);
        req.body.Series = seriesResponse.Series;
      }
    }
    const cookie = await getSLConnection(req);
    const response = await serviceLayerHelper.createSalesQuotation(req.body, cookie);

    if (response.DocNum) {
      docNum = response.DocNum;

      if (enableFircaIntegration) {
        // Submit the invoice to firca.
        let isInvoiceSubmitted = await submitInvoicetoFirca(
          response.DocEntry,
          companyCode,
          "SalesQuotation",
        );
      }
    }

    if (Array.isArray(req.body.salesBatchSelection) && req.body.salesBatchSelection.length > 0) {
      const responseSBS = await createSQSalesBatchSelection(
        response.DocEntry,
        response.DocNum,
        req.body.salesBatchSelection,
        cookie,
      );
    }

    res.status(200).send({ docNum });
  } catch (error) {
    console.log("create SalesQuotation Controller: " + JSON.stringify(error));
    next(error);
  }
};

const createSQSalesBatchSelection = async (
  quotationDocEntry,
  quotationDocNum,
  sbsRequest,
  cookie,
) => {
  try {
    let docNum = [];
    const response = await serviceLayerSBSHelper.createSalesBatchSelection(
      sbsRequest,
      quotationDocEntry,
      quotationDocNum,
      cookie,
    );
    if (response.length > 0) {
      response.forEach(async (item) => {
        const updateInvNumResponse = await updateSQSalesBatchSelection(item, quotationDocEntry);
      });
      docNum.push(response.DocNum);
    }
    return docNum;
  } catch (error) {
    console.log("create SalesQuotation SalesBatchSelection: " + JSON.stringify(error));
    throw error;
  }
};

const update = async (req, res, next) => {
  try {
    const cookie = await getSLConnection(req);

    // DocNum's sole purpose is to be sent back with `success` response.
    // const docNum = req.body.DocNum;
    // delete req.body.DocNum;
    // If any line item is deleted, we neeed to write a logic to delete the associated line item.
    if (req.body.ItemsDeleted && req.body.ItemsDeleted.length > 0) {
      try {
        console.log("Sales Quotation delete in Service Layer.", req.body.ItemsDeleted);
        const { DocEntry } = req.body;
        console.log(
          `Processing deletion of line items from Quotation ${DocEntry}:`,
          JSON.stringify(req.body.ItemsDeleted),
        );
        // Get latest Sales Quotation from Service Layer
        const quotation = await serviceLayerHelper.getSalesQuotation(DocEntry, cookie);
        console.log("Fetched Quotation for update:", JSON.stringify(quotation));
        if (!quotation || !quotation.DocumentLines) {
          console.log("Fetched Quotation Error: ", JSON.stringify(quotation));
          throw new Error("Quotation not found or invalid structure");
        }

        // Remove deleted lines by matching LineNum
        const deletedLineNums = req.body.ItemsDeleted.map((item) => item.LineNum);
        quotation.DocumentLines = quotation.DocumentLines.filter(
          (line) => !deletedLineNums.includes(line.LineNum),
        );
        console.log("Quotation after removing deleted lines:", JSON.stringify(quotation));

        //  Send updated payload back via PUT
        const putResult = await serviceLayerHelper.putSalesQuotation(DocEntry, quotation, cookie);
        console.log("PUT Result after deleting lines:", putResult);
        if (!putResult) {
          throw new Error("Failed to update quotation after deleting lines");
        }

        console.log(
          `Deleted line items [${deletedLineNums}] successfully from Quotation ${DocEntry}`,
        );
      } catch (err) {
        console.error("Error while deleting line items:", err.message);
        throw err; // Let middleware handle the error response
      }
    }
    console.log("Performing Sales Quotation Patch operation.");
    const isUpdated = await serviceLayerHelper.updateSalesQuotation(req.body, cookie);

    if (isUpdated) {
      // Update OSBS table
      const { salesBatchSelection } = req.body;
      if (Array.isArray(salesBatchSelection) && salesBatchSelection.length > 0) {
        const results = await Promise.all(
          salesBatchSelection.map((request) => {
            if (request.DocEntry) {
              return serviceLayerSBSHelper.updateSalesBatchSelection(request, cookie);
            } else {
              return serviceLayerSBSHelper.createSalesBatchSelection(
                request,
                "",
                req.body.DocNum,
                cookie,
              );
            }
          }),
        );
      }

      // res.status(200).send({ success: true, message: "The record has been updated successfully." });
      res.status(200).send({ docNum: req.body.DocNum });
    } else {
      res.status(500).send({ success: false, message: "Failed to update the record." });
    }
  } catch (error) {
    console.log("Update SalesQuotation Controller: " + JSON.stringify(error));
    next(error);
  }
};

module.exports = { create, update };
