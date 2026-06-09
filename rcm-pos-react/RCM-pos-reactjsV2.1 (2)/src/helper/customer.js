import api from "../config/api-nodejs";
import { portalModules, apiURIs } from "../config/config";

const moduleName = portalModules.CUSTOMER;
const apiURI = apiURIs[moduleName];

/**
 * Get the list of Customers
 * @param {*}
 * @returns
 */
export const getCustomerInfo = async (searchKey = null, pageNum = null, pageSize = null) => {
  try {
    const response = await api.get(`custom/${apiURI}`, {
      params: { searchKey, pageNum, pageSize },
    });
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Get the list of Customer Addresses
 * @param {String} cardCode Customer Code
 * @returns
 */
export const getCustomerAddress = async (cardCode) => {
  try {
    const response = await api.get(`custom/${apiURI}/${cardCode}/address`, {});
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get the list of Customer Contact Person
 * @param {String} cardCode Customer Code
 * @returns
 */
export const getCustomerContactPerson = async (cardCode) => {
  try {
    const response = await api.get(`custom/${apiURI}/${cardCode}/contact-person`, {});
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get Special Price for a given Customer & Item
 * @param {String} cardCode Customer Code
 * @param {String} itemCode
 * @returns
 */
export const getCustomerSpecialPrice = async (cardCode, itemCode, warehouseCode) => {
  try {
    const response = await api.get(`custom/${apiURI}/${cardCode}/special-price`, {
      params: { itemCode, warehouseCode },
    });

    return response?.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a Business Partner (Customer)
 * @param {*} request
 * @returns
 */
export const createBusinessPartner = async (request) => {
  try {
    let response = await api.post("/service/business-partner", request);

    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
      console.log(`createBusinessPartner: ${JSON.stringify(response.data)}`);
    }
    if (response.data) {
      return response.data;
    }
    return;
  } catch (err) {
    throw err;
  }
};

// export { getCustomerInfo, createBusinessPartner }
