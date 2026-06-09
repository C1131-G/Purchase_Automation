const { getSLConnection } = require("../helper/service-layer-login");
const serviceLayerHelper = require("../helper/service-layer-sales-batch-selection");

const create = async (req, res, next) => {
  try {
    const cookie = await getSLConnection(req);
    const response = await serviceLayerHelper.createSalesBatchSelection(
      req.body,
      req.body.invoiceDocEntry,
      req.body.invoiceDocNum,
      cookie,
    );
    res.status(200).send(response);
  } catch (error) {
    console.log("create SalesBatchSelection Controller: " + JSON.stringify(error));
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    if (!req.body || !Array.isArray(req.body) || req.body.length === 0) {
      throw new Error("Request body cannot be empty and must be an array");
    }
    const cookie = await getSLConnection(req);
    const results = await Promise.all(
      req.body.map((request) => serviceLayerHelper.updateSalesBatchSelection(request, cookie)),
    );
    res.status(200).send(results);
  } catch (error) {
    console.log("Update Sales Batch Selection Controller: " + JSON.stringify(error));
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const cookie = await getSLConnection(req);
    const { docNum, itemCodes } = req.body;
    if (!docNum || !itemCodes || !Array.isArray(itemCodes) || itemCodes.length === 0) {
      throw new Error("docNum and itemCodes are required, and itemCodes must be a non-empty array");
    }
    const results = await Promise.all(
      itemCodes.map((itemCode) =>
        serviceLayerHelper.getSalesBatchSelection(docNum, itemCode, cookie),
      ),
    );
    res.status(200).send(results);
  } catch (error) {
    console.log("Get Sales Batch Selection Controller: " + JSON.stringify(error));
    next(error);
  }
};

module.exports = { create, update, get };
