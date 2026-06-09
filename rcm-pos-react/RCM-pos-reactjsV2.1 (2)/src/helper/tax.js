import api from "../config/api-nodejs";
import { portalModules, apiURIs } from "../config/config";

const apiURI = "tax";

/**
 * Get the Tax Definitions
 * @param {*}
 * @returns
 */
export const getTaxes = async (filters) => {
  try {
    const response = await api.get(`custom/${apiURI}`, { params: filters });
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`getTaxes: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};
