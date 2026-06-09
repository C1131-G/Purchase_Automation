import api from "../config/api-nodejs";

const apiURI = "custom/user/group/";
/**
 * Gets the list of UserGroup
 * @param {*} params
 * @param {*} pageNum
 * @param {*} pageSize
 * @returns
 */
const getUserGroup = async (params = {}, pageNum, pageSize) => {
  if (pageNum && pageSize) {
    params.pageNum = pageNum;
    params.pageSize = pageSize;
  }
  try {
    const response = await api.get(apiURI, { params }); //userId and/or groupId
    console.log(`UserGroup List: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a UserGroup
 * @param {*} request
 * @returns
 */
const createUserGroup = async (request) => {
  try {
    const response = await api.post(apiURI, request);
    console.log(`Create UserGroup: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates a UserGroup
 * @param {*} request
 * @returns
 */
const updateUserGroup = async (request, id) => {
  try {
    const response = await api.put(`${apiURI}/${id}`, request);
    console.log(`Update UserGroup: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a UserGroup based on the ID passed
 * @param {*} id  PK
 * @returns
 */
const deleteUserGroup = async (id) => {
  try {
    const response = await api.delete(`${apiURI}/${id}`);
    console.log(`Del UserGroup: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data.affected;
    }
    return;
  } catch (error) {
    throw error;
  }
};

export { getUserGroup, createUserGroup, updateUserGroup, deleteUserGroup };
