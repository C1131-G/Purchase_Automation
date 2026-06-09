import api from "../config/api-nodejs";

const apiURI = "custom/store";
/**
 * Gets the list of Store
 * @param {*} params
 * @param {*} pageNum
 * @param {*} pageSize
 * @returns
 */
const getStore = async (params = {}, pageNum, pageSize) => {
  if (pageNum && pageSize) {
    params.pageNum = pageNum;
    params.pageSize = pageSize;
  }
  try {
    const response = await api.get(apiURI, { params });
    console.log(`Store List: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a Store
 * @param {*} request
 * @returns
 */
const createStore = async (request) => {
  try {
    const response = await api.post(apiURI, request);
    console.log(`Create Store: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates a Store
 * @param {*} request
 * @returns
 */
const updateStore = async (request, id) => {
  try {
    const response = await api.put(`${apiURI}/${id}`, request);
    console.log(`Update Store: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a Store based on the ID passed
 * @param {*} id  PK
 * @returns
 */
const deleteStore = async (id) => {
  try {
    const response = await api.delete(`${apiURI}/${id}`);
    console.log(`Del Store: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data.affected;
    }
    return;
  } catch (error) {
    throw error;
  }
};

export { getStore, createStore, updateStore, deleteStore };
