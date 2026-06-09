import api from "../config/api-nodejs";

const parentURI = "custom/store";
const childURI = "warehouse";

/**
 * Gets the list of StoreWarehouse
 * @param {*} parentId
 * @param {*} params
 * @returns
 */
const getStoreWarehouses = async (parentId, params = {}, pageNum, pageSize) => {
  if (pageNum && pageSize) {
    params.pageNum = pageNum;
    params.pageSize = pageSize;
  }
  try {
    if (parentId) {
      const uri = `${parentURI}/${parentId}/${childURI}`;
      const response = await api.get(uri, { params });
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
 * Creates a StoreWarehouse
 * @param {*} request
 * @returns
 */
const createStoreWarehouse = async (request, parentId) => {
  try {
    const response = await api.post(`${parentURI}/${parentId}/${childURI}`, request);
    console.log(`Create StoreWarehouse: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates a StoreWarehouse
 * @param {*} request
 * @returns
 */
const updateStoreWarehouse = async (request, id) => {
  try {
    const response = await api.put(`${parentURI}/${childURI}/${id}`, request);
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
 * Deletes a StoreWarehouse based on the ID passed
 * @param {*} id
 * @returns
 */
const deleteStoreWarehouse = async (id) => {
  try {
    const response = await api.delete(`${parentURI}/${childURI}/${id}`);
    console.log(`StoreWarehouse List: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data.affected;
    }
    return;
  } catch (error) {
    throw error;
  }
};

export { getStoreWarehouses, createStoreWarehouse, updateStoreWarehouse, deleteStoreWarehouse };
