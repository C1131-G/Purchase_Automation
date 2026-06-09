import api from "../config/api-nodejs";

const parentURI = "custom/store";
const childURI = "counter";

/**
 * Gets the list of StoreCounter
 * @param {*} parentId
 * @param {*} params
 * @returns
 */
const getStoreCounters = async (parentId = null, params = {}, pageNum, pageSize) => {
  if (pageNum && pageSize) {
    params.pageNum = pageNum;
    params.pageSize = pageSize;
  }
  try {
    let uri;
    if (parentId) {
      uri = `${parentURI}/${parentId}/${childURI}`;
    } else {
      uri = `${parentURI}/${childURI}/find`;
    }

    console.log("getStoreCounters - params: ", JSON.stringify(params));
    const response = await api.get(uri, { params });
    console.log(`StoreCounters List: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a StoreCounter
 * @param {Object} request
 * @param {Number} parentId
 * @returns
 */
const createStoreCounter = async (request, parentId) => {
  try {
    const response = await api.post(`${parentURI}/${parentId}/${childURI}`, request);
    console.log(`Create StoreCounter: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates a StoreCounter
 * @param {*} request
 * @returns
 */
const updateStoreCounter = async (request, id) => {
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
 * Deletes a StoreCounter based on the ID passed
 * @param {*} id  Number or an Array of Numbers or String values
 * @returns
 */
const deleteStoreCounter = async (id) => {
  try {
    // const response = await api.delete(`${parentURI}/${childURI}`, { data: { id: id }}); //this will send an array of IDs via req.body
    const response = await api.delete(`${parentURI}/${childURI}/${id.toString()}`); //`toString` converts an array to string separated by comman ([1, 2] => 1,2). Single `id` will be sent as is
    console.log(`StoreCounter List: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data.affected;
    }
    return;
  } catch (error) {
    throw error;
  }
};

export { getStoreCounters, createStoreCounter, updateStoreCounter, deleteStoreCounter };
