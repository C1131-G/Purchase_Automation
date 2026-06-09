import api from "../config/api-nodejs";
import { portalModules, apiURIs } from "../config/config";

const moduleName = portalModules.INVOICE;
const apiURI = apiURIs[moduleName];
/**
 * Gets the list of Items under an Invoice
 * @param {String} docNum,
 * @returns
 */
const createFirca = async (request) => {
  try {
    let response = await api.post(`custom/firca`, request);
    // console.log(`getInvoiceItems: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

export { createFirca };
