import api from "../config/api-nodejs";
import { portalModules, itemTypeArrays } from "../config/config";

/**
 * TODO: Need to move this to a 'helper' file adn use it across all the comps.
 * Gets the list of Warehouses/Bin Locations from the resp. APIs and sets them to "state"
 * @param {String} type "BRANCH" or "WAREHOUSE" or "BIN_LOCATION" or "Freights"
 */
const loadDropdownList = async (type, value) => {
  let uri, params, response;
  if (type === "BRANCH") {
    uri = "custom/branch";
    params = { userId: value };
  } else if (type === "WAREHOUSE") {
    uri = "custom/warehouse";
    params = { branchId: value };
  } else if (type === "BIN_LOCATION") {
    uri = "custom/bin-location";
    params = { warehouseCode: value };
  } else if (type === "Freights") {
    uri = "custom/freights";
  }

  try {
    response = await api.get(uri, { params });
    response = response.data;
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`Warehouse/Bin List: ${JSON.stringify(response)}`);
    // if (Array.isArray(response) && response.length) {
    return response;
    // }
  } catch (error) {
    throw error;
  }
};

/**
 * Returns Batch & Serial records in a given Items List array
 * @param {*} itemsList
 * @param {*} moduleName
 * @returns
 */
const getBatchSerialsFromItemsList = (itemsList, moduleName) => {
  let normalItemsList = [],
    batchItemsList = [],
    serialNoItemsList = [];

  let batchNumberArray = itemTypeArrays.BATCH_NUMBERS;
  let serialNumberArray = itemTypeArrays.SERIAL_NUMBERS;

  if (moduleName === portalModules.INVENTORY_COUNTING) {
    batchNumberArray = itemTypeArrays.INVENTORY_COUNTING_BATCH_NUMBERS;
    serialNumberArray = itemTypeArrays.INVENTORY_COUNTING_SERIAL_NUMBERS;
  }

  itemsList.forEach((item, key) => {
    // console.log("handleViewQRCodes item[batchNumberArray]: "+ JSON.stringify(item[batchNumberArray]));
    if (Array.isArray(item[batchNumberArray]) && item[batchNumberArray].length) {
      item[batchNumberArray].map((batch) => {
        // console.log("batch: "+ JSON.stringify(batch));
        batchItemsList.push({
          ItemCode: item.ItemCode,
          BatchNumber: batch.BatchNumber,
          Quantity: batch.Quantity,
          // isSelected: true //this prop is needed to display QR Code in PreviewPrintQRCodes
        });
      });
    } else if (Array.isArray(item[serialNumberArray]) && item[serialNumberArray].length) {
      item[serialNumberArray].map((serial) => {
        serialNoItemsList.push({
          ItemCode: item.ItemCode,
          InternalSerialNumber: serial.InternalSerialNumber,
          Quantity: serial.Quantity,
          // isSelected: true
        });
      });
    }
  });
  // this.setState({
  //   viewQRCodes: true, //to show View QR Codes button
  //   batchSerialsList: [...batchItemsList, ...serialNoItemsList]
  // });
  return [...batchItemsList, ...serialNoItemsList];
};

export { loadDropdownList, getBatchSerialsFromItemsList };
