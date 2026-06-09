import api from "../config/api-nodejs";

const apiURI = "credit-card";

/**
 * Get list of CreditCards
 * @param {*}
 * @returns
 */
export const getCreditCards = async (filters) => {
  try {
    const response = await api.get(`custom/${apiURI}`, { params: filters });
    // if(process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
    //   console.log(`getPaymentTerms: ${JSON.stringify(response.data)}`);

    // CompanyId === "FPOS" returns only the Cards (`Visa, Master, Amex, Debit`) & filters out `Mpaisa`
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};
