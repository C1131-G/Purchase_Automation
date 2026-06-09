const { getSLConnection } = require("../helper/service-layer-login.js");
const serviceLayerHelper = require("../helper/service-layer-inventory-counting.js");
const serviceLayerSBSHelper = require("../helper/service-layer-sales-batch-selection");

exports.create = async (req, res, next) => {
  try {
    const cookie = await getSLConnection(req);
    const response = await serviceLayerHelper.createInventoryCounting(req.body, cookie);

    let docNum = "";
    if (response) {
      docNum = response.DocumentNumber;
    }
    res.status(200).send({ docNum });
  } catch (error) {
    console.log("create InventoryCounting Controller: " + JSON.stringify(error));
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const cookie = await getSLConnection(req);
    const { SalesBatchSelection } = req.body;
    const docNum = req.body.DocNum;
    delete req.body.SalesBatchSelection;
    delete req.body.DocNum;
    console.log("Update InventoryCounting request: " + JSON.stringify(req.body));
    // Update Inventory Counting
    const isUpdated = await serviceLayerHelper.updateInventoryCounting(req.body, cookie);

    if (isUpdated) {
      // Update OSBS table
      //const { salesBatchSelection } = req.body;
      if (Array.isArray(SalesBatchSelection) && SalesBatchSelection.length > 0) {
        const results = await Promise.all(
          SalesBatchSelection.map((request) => {
            if (request.DocEntry) {
              console.log("Update SBS -------->");
              return serviceLayerSBSHelper.updateSalesBatchSelection(request, cookie);
            } else {
              return serviceLayerSBSHelper.createSalesBatchSelection(request, "", docNum, cookie);
            }
          }),
        );
      }
      // res.status(200).send({ success: true, message: "The record has been updated successfully." });
      res.status(200).send({ success: true, message: "Success" });
    } else {
      res.status(500).send({ success: false, message: "Failed to update the record." });
    }
  } catch (error) {
    console.log("update InventoryCounting Controller: " + JSON.stringify(error));
    next(error);
  }
};
