const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const { generatePassword } = require("../utils/generate-password");
const { generateHash } = require("../utils/bcrypt.util.js");
const { selectSalesEmployeeForUser } = require("../config/query-user.js");

/**
 * Get the Sales Employee Code for a given user
 */
const getSalesEmployeeForUser = (userId) => {
  try {
    const rows = dbHelper.executeWithValues(selectSalesEmployeeForUser, [userId]);
    // console.log("getSalesEmployeeForUser- rows: "+JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.log("getSalesEmployeeForUser - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * @param {String} userGroup
 * @returns List of users under given 'User Group', sorted in ASC order based on UserName
 */
const getUsersByUserGroup = (userGroup) => {
  const sql = `${query.selectUsersInUserGroup} '%${userGroup}%' ORDER BY T0."U_NAME" ASC`;
  try {
    const result = dbHelper.executeWithValues(sql);
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * @param {String} userId
 * @returns List of UserGrpop under given 'User'
 */
const getUserGroupByUser = (userId) => {
  try {
    const result = dbHelper.executeWithValues(query.selectUserGroupInUser, userId);
    console.log("getUserGroupByUser- rows: " + JSON.stringify(result));
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * @param {String} userGroup
 * @returns List of IDs of the users under a given 'User Group', sorted in ASC order based on UserName
 */
const getUserIDsByUserGroup = (userGroup) => {
  try {
    const userRC = getUsersByUserGroup(userGroup);
    console.log("userRC: ", JSON.stringify(userRC));
    if (Array.isArray(userRC) && userRC.length > 0) {
      let result = [];
      userRC.forEach((user) => {
        result.push(user.U_UserId);
      });
      return result;
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * @param {String} userGroup
 * @returns List of Names of the users under a given 'User Group', sorted in ASC order based on UserName
 */
const getUserNamesByUserGroup = (userGroup) => {
  try {
    const userRC = getUsersByUserGroup(userGroup);
    if (Array.isArray(userRC) && userRC.length > 0) {
      let result = [];
      userRC.forEach((user) => {
        result.push(user.UserName);
      });
      return result;
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * @param {Number} userId
 * @returns User info for a given ID
 */
const getUserInfo = (userId) => {
  try {
    const result = dbHelper.executeWithValues(query.selectUserInfo, userId);
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * Gets User Permissions for All modules
 * @param {Number} userId
 * @returns User permissions
 */
const getUserPermissions = (userId) => {
  try {
    const result = dbHelper.executeWithValues(query.getUserPermissionsForAllModules, userId);
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * @param {String} userName
 * @param {String} mailId
 * @returns User info for a given Username & MailId
 */
const getUserInfoWithUserNameMail = (userName, mailId) => {
  try {
    const result = dbHelper.executeWithValues(query.validateUserEmail, [userName, mailId]);
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * Set Temp password for given 'userId'
 * @param {*} userId
 * @returns Temp password
 */
const setTemporaryPassword = async (userId) => {
  try {
    const tempPassword = generatePassword();
    const hashedPassword = await generateHash(tempPassword);

    const result = dbHelper.executeWithValues(query.updatePortalPassword, [
      hashedPassword,
      "Y",
      userId,
    ]); //set tempPasswordFlag as "Y" when setting Temp Password
    // console.log("setTemporaryPassword %s | tempPassword %s", JSON.stringify(result), tempPassword);
    if (result > 0) {
      return tempPassword;
    }
    return;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getUserInfo,
  getUserPermissions,
  getUsersByUserGroup,
  getUserGroupByUser,
  getUserIDsByUserGroup,
  getUserNamesByUserGroup,
  getUserInfoWithUserNameMail,
  setTemporaryPassword,
  getSalesEmployeeForUser,
};
