import api from "../config/api-nodejs";

/**
 * Gets the list of Open Sale Orders
 * @param {String} branchId
 * @returns
 */
const getOpenSaleOrders = async (branchId) => {
  try {
    let response = await api.get("custom/sale-order", {
      params: { userId: localStorage.getItem("InternalKey"), branchId },
    });
    console.log(`getOpenSaleOrders: ${JSON.stringify(response.data)}`);
    // if (Array.isArray(response.data) && response.data.length) {
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the list of Items under a Sale Order
 * @param {String} docNum
 * @returns
 */
const getSaleOrderItems = async (docNum) => {
  try {
    let response = await api.get("custom/sale-order/items", {
      params: { userId: localStorage.getItem("InternalKey"), docNum },
    });
    console.log(`getOpenSaleOrders: ${JSON.stringify(response.data)}`);
    // if (Array.isArray(response.data) && response.data.length) {
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

export { getOpenSaleOrders, getSaleOrderItems };
