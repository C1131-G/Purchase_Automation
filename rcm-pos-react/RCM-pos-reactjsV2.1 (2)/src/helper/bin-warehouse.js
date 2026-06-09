import { itemRequestType } from "../config/config";
import api from "../config/api-nodejs";

/**
 * Gets a list of Warehouses (WHCode & WHName) under a given Branch
 * @param {*} branchId
 * @returns
 */
const getWarehousesForBranch = async (branchId = null) => {
  try {
    const response = await api.get("custom/warehouse", { params: { branchId } });
    // console.log(`Warehouse/Bin List: ${JSON.stringify(response)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Gets a list of Warehouses (WHCode & WHName) under a given Location
 * @param {*} locationCode
 * @returns
 */
const getLocationWiseWarehouses = async (locationCode = null) => {
  try {
    const response = await api.get("custom/warehouse", { params: { locationCode: locationCode } });
    // console.log(`Warehouse/Bin List: ${JSON.stringify(response)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get all Batch/Serial records for a given Item inside a given WH & Bin
 * @param {*} itemType
 * @param {*} itemCode
 * @param {*} warehouseCode
 * @param {*} binCode
 * @returns
 */
const getBatchSerialRecords = async (itemType, itemCode, warehouseCode, binCode) => {
  try {
    return await getBinsAndItemQtyForWarehouse(
      itemRequestType.BATCH_SERIAL_IN_A_BIN,
      warehouseCode,
      itemCode,
      binCode,
      null,
      null,
      itemType,
    );
  } catch (err) {
    throw err;
  }
};

/**
 * Get all Items with Qty > 0 for a given Bin Code
 * @param {*} binCode
 */
const getItemsInBin = async (binCode, pageNum, pageSize) => {
  try {
    return await getBinsAndItemQtyForWarehouse(
      "BINS_AND_ITEM_QTY",
      null,
      null,
      binCode,
      pageNum,
      pageSize,
    );
  } catch (err) {
    throw err;
  }
};

/**
 *
 * Get the list of Bins & the Available Qty in each Bin for the passed Item & Warehouse
 * TODO: Search for this funct. in all components adn replace them with this util funct.
 * @param {*} requestType
 * @param {*} warehouseCode
 * @param {*} itemCode
 * @param {*} binCode
 * @param {*} pageNum
 * @param {*} pageSize
 * @param {*} itemType
 * @returns
 */
const getBinsAndItemQtyForWarehouse = async (
  requestType,
  warehouseCode,
  itemCode,
  binCode,
  pageNum,
  pageSize,
  itemType,
) => {
  let params = {};
  let uri = "custom/bin-location";

  if (itemCode) {
    params.itemCode = itemCode;
  }
  if (warehouseCode) {
    params.warehouseCode = warehouseCode;
  }
  if (binCode) {
    params.binCode = binCode;
  }
  if (pageNum && pageSize) {
    params.pageNum = pageNum;
    params.pageSize = pageSize;
  }

  if (requestType === "BINS_AND_ITEM_QTY") {
    uri = `${uri}/available-item-qty`;
    // params = { itemCode, warehouseCode };
  } else if (requestType === "BINS") {
    params = { warehouseCode };
  } else if (requestType === itemRequestType.BATCH_SERIAL_IN_A_BIN) {
    uri = `custom/batch-serial-info`;
    params.type = itemRequestType.BATCH_SERIAL_IN_A_BIN;
    params.itemType = itemType;
  }
  try {
    const response = await api.get(uri, { params });
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`BinLocation + Avail. Qty List: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get Items based on Barcode & Warehouse
 * @param {Object} params Valid props: { warehouseCode, barCode, binCode, itemCode, itemName, pageNum, pageSize }
 * @returns
 */
const getItemsWithBarcode = async (params) => {
  // let params = {};

  // if(barCode) {
  //   params.barCode = barCode;
  // }
  // if(warehouseCode) {
  //   params.warehouseCode = warehouseCode
  // }
  // if(itemCode) {
  //   params.itemCode = itemCode;
  // }
  // if(binCode) {
  //   params.binCode = binCode;
  // }
  // if(pageNum && pageSize){
  //   params.pageNum = pageNum;
  //   params.pageSize = pageSize;
  // }

  console.log(`getItemsWithBarcode - params: ${JSON.stringify(params)}`);

  try {
    let response;
    if (params.branch) {
      response = await api.get("custom/bin-location/available-item-qty-price-with-pricelist", {
        params,
      });
    } else {
      response = await api.get("custom/bin-location/available-item-qty-price", { params });
    }
    //const response = await api.get("custom/bin-location/available-item-qty-price", { params });
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`BinLocation + Avail. Qty List: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

export {
  getBinsAndItemQtyForWarehouse,
  getItemsInBin,
  getBatchSerialRecords,
  getWarehousesForBranch,
  getItemsWithBarcode,
  getLocationWiseWarehouses,
};
