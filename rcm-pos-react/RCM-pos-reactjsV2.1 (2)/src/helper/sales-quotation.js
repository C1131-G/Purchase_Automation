import api from "../config/api-nodejs";
import { portalModules, apiURIs } from "../config/config";

const moduleName = portalModules.SALES_QUOTATION;
const apiURI = apiURIs[moduleName];

/**
 * Get the SalesQuotation Details
 * @param {*}
 * @returns
 */
const getSalesQuotation = async (filters) => {
  try {
    const response = await api.get(`custom/${apiURI}`, { params: filters });
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`getSalesQuotation: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the list of Items under a SalesQuotation
 * @param {String} recordType Draft or Delviery
 * @param {String} filters
 * @returns
 */
const getSalesQuotationItems = async (recordType = "", filters) => {
  try {
    let response = await api.get(`custom/${apiURI}/items/${recordType}`, { params: filters });
    console.log(`getSalesQuotationItems: ${JSON.stringify(response.data)}`);
    if (response.data && response.data.itemsList) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

// /**
//  * Gets the Tax Info of a SalesQuotation
//  * @param {String} recordType Draft or Delviery
//  * @param {String} filters
//  * @returns
//  */
// const getSalesQuotationTax = async (recordType, filters) => {
//   try {
//     let response = await api.get(`custom/${apiURI}/tax/${recordType}`,
//       { params: { userId : localStorage.getItem("InternalKey"), ...filters } });
//     console.log(`getSalesQuotationTax: ${JSON.stringify(response.data)}`);
//     if(response.data) {
//       return response.data;
//     }
//     return;
//   }
//   catch (error) {
//     throw error;
//   }
// }

/**
 * Creates a SalesQuotation Draft
 * @param {*} request
 * @returns
 */
const createSalesQuotation = async (request) => {
  try {
    let response = await api.post(`/service/${apiURI}`, request);

    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
      console.log(`createSalesQuotation: ${JSON.stringify(response.data)}`);
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
 * Updates a SalesQuotation Draft
 * @param {*} request
 * @returns
 */
const updateSalesQuotation = async (request) => {
  try {
    let response = await api.patch(`/service/${apiURI}`, request);

    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
      console.log(`updateSalesQuotation: ${JSON.stringify(response.data)}`);
    }
    if (response.data) {
      return response.data;
    }
    return;
  } catch (err) {
    throw err;
  }
};

export { getSalesQuotation, getSalesQuotationItems, createSalesQuotation, updateSalesQuotation }; //, getSalesQuotationTax
