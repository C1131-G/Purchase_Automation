import api from "../config/api-nodejs";

const apiURI = "payment-terms";

/**
 * Get PaymentTerms
 * @param {*}
 * @returns
 */
export const getPaymentTerms = async (filters) => {
  try {
    const response = await api.get(`custom/${apiURI}`, { params: filters });
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`getPaymentTerms: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};
