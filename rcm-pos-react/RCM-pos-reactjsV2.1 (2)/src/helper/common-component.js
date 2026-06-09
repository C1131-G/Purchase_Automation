import api from "../config/api-nodejs";

const commonApiURIs = {
  ITEMMASTERGROUPCODE: "item-master/groups",
  ITEMMASTERSUBGROUP1: "item-master/sub-groups/1",
  ITEMMASTERSUBGROUP2: "item-master/sub-groups/2",
  ITEMMASTERSUBGROUP3: "item-master/sub-groups/3",
  STORELOCATION: "locations",
};

/**
 * Get the Item List Details
 * @param {*}
 * @returns
 */
const getComponentList = async (filters, module) => {
  try {
    let commonApiURI = commonApiURIs[module];

    if (!commonApiURI) {
      throw new Error(`Module '${module}' not found in commonComponentAPiURI.`);
    }

    const response = await api.get(`custom/${commonApiURI}`, { params: filters });
    if (process.env.REACT_APP_LOGGING_LEVEL === "DEBUG")
      console.log(`${module}: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Gets a list of Filtered Records
 * @param {*}
 * @returns
 */
const getFilterComponentList = async (paramsName = null, paramsValue = null) => {
  try {
    const response = await api.get("custom/warehouse", { params: { paramsName: paramsValue } });
    // console.log(`Warehouse/Bin List: ${JSON.stringify(response)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

export { getComponentList, getFilterComponentList };
