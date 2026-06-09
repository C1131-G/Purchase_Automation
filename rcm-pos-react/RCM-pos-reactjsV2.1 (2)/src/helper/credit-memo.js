import api from "../config/api-nodejs";
import { portalModules, apiURIs } from "../config/config";

const moduleName = portalModules.CREDIT_MEMO_REQUEST;
const apiURI = apiURIs[moduleName];

/**
 * Creates an CreditMemo (Returns via POS)
 * @param {*} request
 * @returns
 */
const createCreditMemo = async (request) => {
  try {
    let response = await api.post(`/service/${apiURI}`, request, {
      headers: {
        "Content-Type": "multipart/form-data", // Let browser handle boundary
      },
    });

    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
      console.log(`createCreditMemo: ${JSON.stringify(response.data)}`);
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
 * Get the list of CreditMemo (Returnss made via POS)
 * @param {Object} params - fromDate, toDate, cardCode, docStatus, locationName,
 *                            searchKey, pageNum, pageSize
 * @returns
 */
const getCreditMemo = async (params) => {
  try {
    console.log("params: ", params);
    const response = await api.get(`custom/${apiURI}`, { params });
    // if(process.env.REACT_APP_LOGGING_LEVEL === "DEBUG") {
    //   console.log(`getCreditMemo: ${JSON.stringify(response.data)}`);
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
 * Gets the list of Items under a Returns
 * @param {String} docNum
 * @returns
 */
const getCreditMemoItems = async (docNum) => {
  try {
    let response = await api.get(`custom/${apiURI}/items`, { params: { docNum } });
    // console.log(`getCreditMemoItems: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

export { createCreditMemo, getCreditMemo, getCreditMemoItems };
