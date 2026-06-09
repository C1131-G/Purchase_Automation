import api from "../config/api-nodejs";
import { itemRequestType, itemTypes } from "../config/config";
/**
 * Gets the Batch/Serial info along with Bin & Available Qty for the Item list/BatchSerial nos. passed
 */
const getBatchSerialInfo = async (itemsList, type = "", batchSerialNo = "") => {
  let params;
  /* for 'old' items that don't have QR Code, get all the items that match
   * all 'ItemCode-FromWarehouse' combination & display them in the 'old'
   * item popup. Let the user select the Batch/Serial no. they want
   * (instead of Scanning/Entering Batch or Sr. no.)
   */
  if (
    type === itemRequestType.ITEM_WITHOUT_QRCODE ||
    type === itemRequestType.BATCH_SERIAL_WITH_ALL_BINS
  ) {
    let itemAndWHCodes = [];
    itemsList.forEach((item) => {
      itemAndWHCodes.push({
        itemCode: item.ItemCode,
        //'FromWarehouse' is from STR Row table (when creating ST) & 'wareHouse' is from Prod. Order
        //Row tab when creating ISP
        //'WarehouseCode' added for Sale
        //`WhsCode` added for Invoice
        warehouseCode: item.FromWarehouse
          ? item.FromWarehouse
          : item.WarehouseCode
            ? item.WarehouseCode
            : item.WhsCode
              ? item.WhsCode
              : item.wareHouse,
      });
    });
    params = { itemAndWHCodes: itemAndWHCodes, type: type };
  }
  //for items that have QR Codes (created after POS implementation)
  else {
    /* If the user scans a code, 'batchSerialNo' arg will have a valid value. If a no. is manually
     * entered this arg. will be empty in which case the value from the 'state' is sent to the api
     */

    /*
    This is not required in the Helper method, was copied from a component
    if(!batchSerialNo) {
      batchSerialNo = this.state.batchSerialNo;
    }
    //if the Batch/Serial No. is not entered
    if(!batchSerialNo) {
      this.setState({ warningMsg: "Enter a valid Batch or Serial No." });
    }
    else {
      */

    // params = { batchSerialNo: batchSerialNo };
    if (batchSerialNo.BNo) {
      params = { batchSerialNo: batchSerialNo.BNo };
    } else if (batchSerialNo.SNo) {
      params = { batchSerialNo: batchSerialNo.SNo };
    } else if (batchSerialNo.ItemNo) {
      params = { batchSerialNo: batchSerialNo.ItemNo };
    } else {
      params = { batchSerialNo: batchSerialNo };
    }
    // }
  }

  if (params) {
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log("getBatchSerialInfo - params:" + JSON.stringify(params));
    try {
      const response = await api.get("custom/batch-serial-info", {
        params: params,
      });
      // console.log("getBatchSerialInfo - type:" +type);

      if (
        type === itemRequestType.ITEM_WITHOUT_QRCODE ||
        type === itemRequestType.BATCH_SERIAL_WITH_ALL_BINS
      ) {
        if (Array.isArray(response.data) && response.data.length) {
          return response.data;
        } else {
          return;
          // this.setState({
          //   warningMsg: "No items found. Please scan a QR Code or enter a Batch/Serial No. to add"
          // });
        }
      } else {
        if (Array.isArray(response.data) && response.data.length) {
          // this.props.addScannedBatchSerialItemToRow(response.data[0]);
          return response.data[0];
        } else {
          // this.setState({
          //   warningMsg: "No matching record found in the system for the Batch/Serial No. you entered. Please try a different one.",
          //   batchSerialNo: ""
          // });
          return;
        }
      }
    } catch (err) {
      throw err;

      // if(err.response) {
      //   this.setState({ warningMsg: err.response.data.message })
      // }
      // else {
      //   this.setState({ warningMsg: JSON.stringify(err) });
      // }
    } finally {
      // this.setState({ isLoading: false });
    }
  }
};

/**
 * Gets the list of Normal Items' Code & Desc from Item Master table.
 * When a Normal Item is present in the list, the app must let users submit a
 * request without entering a Batch/Serial# or scanning a QR Code
 *
 * @param {Array} allItemsList  List within which Normal/Labor items are looked for
 *                              This param will be null for requests coming from Inv. Counting screen
 * @param {String} itemType     Type of the item, that must be looked within the givn Items array
 */
const getItemsList = async (allItemsList, itemType) => {
  let allItemCodes = [],
    isAllAreNormalItems = true,
    itemsList = [];
  let params = { itemType: itemType };
  if (allItemsList) {
    allItemsList.forEach((item) => {
      allItemCodes.push(item.ItemCode);
    });
    params.itemCodes = allItemCodes;
  }

  try {
    const response = await api.get("custom/item", {
      params: params,
    });
    // params: { itemType: itemType, itemCodes: allItemCodes }});
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`Normal Items List: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      itemsList = response.data;

      if (itemType === itemTypes.NORMAL) {
        //to check if ALL the items in the 'itemsList' are NORMAL items
        for (let i = 0; i < allItemCodes.length; i++) {
          //if any of the item in the ALL list is not included in the NORMAL list
          if (!itemsList.includes(allItemCodes[i])) {
            isAllAreNormalItems = false;
            break;
          }
        }
        return { itemsList, isAllAreNormalItems };
      } else if (itemType === itemTypes.LABOR) {
        return itemsList;
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get the list of Items
 * @param {*}
 * @returns
 */
const getItems = async (searchKey = null, pageNum = null, pageSize = null) => {
  try {
    const response = await api.get("custom/item", { params: { pageNum, pageSize, searchKey } });

    // if(process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
    //   console.log(`getItems: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Returns the type of an Item, BATCH or SERIAL or NORMAL
 */
const getItemType = (item) => {
  if (item.ManBtchNum === "Y") {
    return itemTypes.BATCHES;
  } else if (item.ManSerNum === "Y") {
    return itemTypes.SERIAL_NUMBERS;
  } else if (item.InvntItem === "N") {
    return itemTypes.NORMAL;
  }
};

/**
 * Get the Available Stock with warehouse list by item.
 * @param {*}
 * @returns
 */
const getAvailableStock = async (itemCode) => {
  try {
    const response = await api.get("custom/item-qty-in-warehouse", {
      params: { itemCode },
    });

    // if(process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
    //   console.log(`getItems: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Get the Available Stock with warehouse list by item.
 * @param {*}
 * @returns
 */
const getTimYardItems = async (itemCode, warehouseCode, isStockCounter) => {
  //const getTimYardItems = async (itemCode, warehouseCode) => {
  try {
    const response = await api.get("custom/tim-yard-items", {
      params: { itemCode, warehouseCode, isStockCounter },
      //params: { itemCode, warehouseCode },
    });

    // if(process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
    //   console.log(`getItems: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

const getTimYardItemsinView = async (docNum, itemCodes) => {
  try {
    // Ensure itemCodes is always an array
    const normalizedItemCodes = Array.isArray(itemCodes) ? itemCodes : [itemCodes];

    console.log("getTimYardItemsinView - docNum:", docNum);
    console.log("getTimYardItemsinView - itemCodes:", normalizedItemCodes);

    const response = await api.post("service/sales-batch-selection/get", {
      docNum,
      itemCodes: normalizedItemCodes,
    });

    if (Array.isArray(response.data) && response.data.length) {
      return response.data[0];
    }

    return;
  } catch (error) {
    console.error("Error in getTimYardItemsinView:", error);
    throw error;
  }
};

const getBinCodeInfo = async (warehouseCode, itemCode) => {
  try {
    const response = await api.get("custom/bincode-info", {
      params: { warehouseCode, itemCode },
    });

    if (Array.isArray(response.data) && response.data.length) {
      return response.data[0];
    }
    return;
  } catch (error) {
    throw error;
  }
};

export {
  getItemsList,
  getBatchSerialInfo,
  getItemType,
  getItems,
  getAvailableStock,
  getTimYardItems,
  getTimYardItemsinView,
  getBinCodeInfo,
};
