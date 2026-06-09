import api from "../config/api-nodejs";

/**
 * Get All Portal Users
 */
const getPortalUsers = async () => {
  try {
    let response = await api.get("custom/portal-users", { params: {} });
    console.log("getPortalUsers - response: " + JSON.stringify(response.data));
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (err) {
    throw err;
  }
};

/**
 * Gets the list of Users under a User Group
 * @param {String} userGroup
 * @param {Object} params    Filter params
 * @returns
 */
const getUsersByUserGroup = async (userGroup, params) => {
  try {
    const response = await api.get(`custom/user-groups/${userGroup}/user`, { params });
    console.log(`Users: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the list of Permissions for all modules for a given UserId
 * @param {Number} userId
 * @returns
 */
const getUserPermissionsByUserId = async (userId) => {
  try {
    const response = await api.get(`custom/user/${userId}/permissions`, {});
    // console.log(`permissions: ${JSON.stringify(response.data)}`);
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Generates a Temp Password for given user
 * @param {*} internalKey UserId
 * @returns tempPassword
 */
const generateTempPassword = async (internalKey) => {
  //userName, mailId
  try {
    const request = { internalKey };
    // const request = { userName, mailId };
    const response = await api.post(`custom/temp-password`, request);
    if (response.data) {
      return response.data.tempPassword;
    }
    return "";
  } catch (err) {
    throw err;
  }
};

/**
 * Gets All Portal User Groups
 **/
const getUserGroupsList = async () => {
  try {
    let response = await api.get("custom/user-groups", {
      params: { userId: localStorage.getItem("InternalKey") },
    });
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (err) {
    throw err;
  }
};

/**
 * Gets All Permissions (for each Module) under a User Group
 * @param {Number} groupId
 **/
const getUserGroupPermissions = async (groupId) => {
  try {
    let response = await api.get(`custom/user-groups/${groupId}/permissions`, {
      params: { userId: localStorage.getItem("InternalKey") },
    });
    if (Array.isArray(response.data) && response.data.length) {
      return response.data;
    }
    return [];
  } catch (err) {
    throw err;
  }
};

export {
  getUsersByUserGroup,
  getUserPermissionsByUserId,
  generateTempPassword,
  getUserGroupsList,
  getUserGroupPermissions,
  getPortalUsers,
};
