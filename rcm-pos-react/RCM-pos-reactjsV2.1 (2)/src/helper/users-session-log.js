import api from "../config/api-nodejs";

const apiURI = "custom/user-session-log";
/**
 * Gets the list of UsersSessionLog
 * @param {*} params
 * @param {*} pageNum
 * @param {*} pageSize
 * @returns
 */
const getUsersSessionLog = async (params = {}, pageNum, pageSize) => {
  if (pageNum && pageSize) {
    params.pageNum = pageNum;
    params.pageSize = pageSize;
  }
  try {
    const response = await api.get(apiURI, { params });
    console.log(`Users Session Log: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Updates a UsersSessionLog
 * @param {Object} request
 * @param {Number} id
 * @returns
 */
const updateUsersSessionLog = async (request, id) => {
  try {
    const response = await api.put(`${apiURI}/${id}`, request);
    console.log(`Update UsersSessionLog: ${JSON.stringify(response.data)}`);
    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    throw error;
  }
};

export { getUsersSessionLog, updateUsersSessionLog };
