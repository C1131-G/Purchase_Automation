import api from "../config/api-nodejs";

const parentURI = "custom/store";
const childURI = "user";

/**
 * Gets the list of StoreUser
 * @param {*} parentId
 * @param {*} params
 * @returns
 */
const getStoreUsers = async (parentId, params = {}, pageNum, pageSize) => {
  if (pageNum && pageSize) {
    params.pageNum = pageNum;
    params.pageSize = pageSize;
  }
  try {
    // let uri = `${parentURI}/${childURI}/find`;
    if (parentId) {
      const uri = `${parentURI}/${parentId}/${childURI}`;
      console.log(`StoreUsers List - params: ${JSON.stringify(params)}`);
      const response = await api.get(uri, { params });
      console.log(`StoreUsers List: ${JSON.stringify(response.data)}`);
      if (Array.isArray(response.data) && response.data.length) {
        return response.data;
      }
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a StoreUser
 * @param {*} request
 * @returns
 */
const createStoreUser = async (request, parentId) => {
  try {
    const response = await api.post(`${parentURI}/${parentId}/${childURI}`, request);
    console.log(`Create StoreUser: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a StoreUser based on the ID passed
 * @param {*} id
 * @returns
 */
const deleteStoreUser = async (id) => {
  try {
    const response = await api.delete(`${parentURI}/${childURI}/${id}`);
    console.log(`StoreUser List: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data.affected;
    }
    return;
  } catch (error) {
    throw error;
  }
};

export { getStoreUsers, createStoreUser, deleteStoreUser };
