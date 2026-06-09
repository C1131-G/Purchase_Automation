import api from "../config/api-nodejs";

const apiURI = "banks";

/**
 * Get Banks
 * @param {*}
 * @returns
 */
export const getBanks = async (filters) => {
  try {
    const response = await api.get(`custom/${apiURI}`, { params: filters });
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};
