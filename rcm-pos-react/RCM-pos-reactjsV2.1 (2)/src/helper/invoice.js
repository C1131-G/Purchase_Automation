import api from "../config/api-nodejs";
import { portalModules, apiURIs } from "../config/config";

const moduleName = portalModules.INVOICE;
const apiURI = apiURIs[moduleName];

const formatDateLocal = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get the list of Invoices (Sales made via POS)
 * @param {Object} params - fromDate, toDate, cardCode, docStatus, locationName,
 *                            searchKey, pageNum, pageSize
 * @returns
 */
const getInvoices = async (params) => {
  try {
    console.log("params: ", params);
    // Helper to format date as YYYY-MM-DD (local, no timezone shift)
    const newParams = {
      ...params,
      fromDate: formatDateLocal(params.fromDate),
      toDate: formatDateLocal(params.toDate),
    };
    const response = await api.get(`custom/${apiURI}`, { params: newParams });
    // if(process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
    //   console.log(`getInvoices: ${JSON.stringify(response.data)}`);
    // }
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the list of Items under an Invoice
 * @param {String} docNum
 * @returns
 */
const getInvoiceItems = async (docNum) => {
  try {
    let response = await api.get(`custom/${apiURI}/items`, { params: { docNum } });
    // console.log(`getInvoiceItems: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the list of Items under an Invoice
 * @param {String} docNum
 * @returns
 */
const updateReprintFlag = async (docEntry) => {
  try {
    let response = await api.patch(`custom/${apiURI}/reprint`, {
      DocEntry: docEntry,
      U_IsReprinted: "Y",
    });
    // console.log(`getInvoiceItems: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Creates an Invoice (Sale via POS)
 * @param {*} request
 * @returns
 */
const createInvoice = async (request) => {
  try {
    let response = await api.post(`/service/${apiURI}`, request);

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

export { getInvoices, createInvoice, getInvoiceItems, updateReprintFlag };
