const storeService = require("../entities/services/stores.service.js");
const storeWarehouseService = require("../entities/services/store-warehouses.service.js");
const storeCounterService = require("../entities/services/store-counters.service.js");
const storeUsersService = require("../entities/services/store-users.service.js");

/**
 * Gets the Store Location & Counter info for the give user
 * @param {*} userId
 */
exports.getUserStoreInfo = async (userId) => {
  try {
    let storeId = null,
      storeCounterId = null,
      counterCode = "";
    counterName = "";
    let locationCode = "",
      storeLocation = "",
      storeWHCode = "";

    // Get User Counter
    const storeCounter = await storeCounterService.getStoreCounter({ userId });
    if (Array.isArray(storeCounter) && storeCounter.length > 0) {
      storeId = storeCounter[0].storeId;
      storeCounterId = storeCounter[0].storeCounterId;
      counterCode = storeCounter[0].counterCode;
      counterName = storeCounter[0].counterName;
    }

    // If a user is not assigned to a Counter, get his Store info from StoreUser table
    if (!storeId) {
      const storeUser = await storeUsersService.getStoreUser({ userId });
      if (Array.isArray(storeUser) && storeUser.length > 0) {
        storeId = storeUser[0].storeId;
      }
    }

    if (storeId) {
      // Get User Store
      const store = await storeService.getStore({ storeId });
      // console.log("store: ", store[0]);
      if (Array.isArray(store) && store.length > 0) {
        locationCode = store[0].locationCode;
        storeLocation = store[0].location;

        // Get User Warehouse
        const storeWarehouse = await storeWarehouseService.getStoreWarehouse({ storeId });
        // console.log("storeWarehouse: ", storeWarehouse[0]);
        if (Array.isArray(storeWarehouse) && storeWarehouse.length > 0) {
          storeWHCode = storeWarehouse[0].warehouseCode;
        }
      }
    }

    return {
      storeId,
      storeCounterId,
      counterCode,
      counterName,
      locationCode,
      storeLocation,
      storeWHCode,
    };
  } catch (err) {
    throw err;
  }
};
