import api from "../config/api-nodejs";

/**
 * Get the Delivery Details
 * @param {*}
 * @returns
 */
const getDelivery = async (filters) => {
  try {
    const response = await api.get("custom/delivery", { params: filters });
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`getDelivery: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the list of Items under a Delivery
 * @param {String} recordType Draft or Delviery
 * @param {String} filters
 * @returns
 */
const getDeliveryItems = async (recordType, filters) => {
  try {
    let response = await api.get(
      `custom/delivery/items/${recordType}`, //service/delivery/items
      { params: { userId: localStorage.getItem("InternalKey"), ...filters } },
    );
    console.log(`getDeliveryItems: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the Tax Info of a Delivery
 * @param {String} recordType Draft or Delviery
 * @param {String} filters
 * @returns
 */
const getDeliveryTax = async (recordType, filters) => {
  try {
    let response = await api.get(`custom/delivery/tax/${recordType}`, {
      params: { userId: localStorage.getItem("InternalKey"), ...filters },
    });
    console.log(`getDeliveryTax: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a Delivery Draft
 * @param {*} request
 * @returns
 */
const createDelivery = async (request) => {
  try {
    let response = await api.post("/service/delivery", request);

    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
      console.log(`createDelivery: ${JSON.stringify(response.data)}`);
    }
    if (response.data) {
      return response.data;
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * Updates a Delivery Draft
 * @param {*} request
 * @returns
 */
const updateDelivery = async (request) => {
  try {
    let response = await api.patch("/service/delivery/draft", request);

    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
      console.log(`updateDelivery: ${JSON.stringify(response.data)}`);
    }
    if (response.data) {
      return response.data;
    }
    return;
  } catch (err) {
    throw err;
  }
};
export { getDelivery, getDeliveryItems, getDeliveryTax, createDelivery, updateDelivery };
