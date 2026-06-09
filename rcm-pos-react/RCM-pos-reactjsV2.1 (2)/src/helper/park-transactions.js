import api from "../config/api-nodejs";

/**
 * Creates an parked transaction
 * @param {*} request
 * @returns
 */
const createSharedParkTransactions = async (request) => {
  try {
    let response = await api.post(`custom/parked-transaction`, request);

    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
      console.log(`createInvoice: ${JSON.stringify(response.data)}`);
    }
    if (response.data) {
      return response.data;
    }
    return "";
  } catch (err) {
    throw err;
  }
};

/**
 * Get the Array of parked transactions
 * @param {Object} params -
 * @returns
 */
const getSharedParkTransactions = async () => {
  try {
    const response = await api.get(`custom/parked-transaction`, {});
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a StoreSharedParkTransaction based on the ID passed
 * @param {*} id  Number
 * @returns
 */
const deleteSharedParkTransaction = async (id) => {
  try {
    const response = await api.delete(`custom/parked-transaction/${id}`);
    if (response.data) {
      return response.data.affected;
    }
    return;
  } catch (error) {
    throw error;
  }
};

export { createSharedParkTransactions, getSharedParkTransactions, deleteSharedParkTransaction };
