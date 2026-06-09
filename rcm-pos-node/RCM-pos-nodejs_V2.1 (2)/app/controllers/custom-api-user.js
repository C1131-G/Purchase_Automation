const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const { getRandomNo, formatDate, getClientHostname } = require("../utils/utils");
const forgotPasswordTemplate = require("../mail-templates/forgot-password");
const { sendMail } = require("../helper/send-mail");
const { generateHash, comparePassword } = require("../utils/bcrypt.util.js");
const userHelper = require("../helper/users");
const { createUserSessionLog } = require("../entities/services/user-session-log.service");
const { getUserStoreInfo } = require("../helper/stores.js");
const { canAssignUserToCounter } = require("../helper/user-session-log.js");
const { getLocationDefaults } = require("../helper/locations.js");

/**
 * Validate user login
 */
const validateUserLogin = async (req, res, next) => {
  console.log("validateUserLogin - req.body: " + JSON.stringify(req.body));
  try {
    let isUserAuthenticated = false;
    const rows = dbHelper.executeWithValues(query.validateUserLogin, [req.body.userName]);
    console.log("validateUserLogin %s", JSON.stringify(rows));

    if (Array.isArray(rows) && rows.length) {
      if (rows[0].U_PortalAccountLocked === "Y") {
        console.log("rows[0].U_PortalAccountLocked: " + rows[0].U_PortalAccountLocked);
        next({ statusCode: 401, message: "Your account is locked. Please contact Admin!" });
      } else if (rows[0].U_PortalUser !== "Y") {
        console.log("rows[0].U_PortalUser: " + rows[0].U_PortalUser);
        next({ statusCode: 401, message: "User is unauthorized. Please contact Admin!" });
      } else {
        console.log("rows[0].Password: " + rows[0].Password);
        isUserAuthenticated = await comparePassword(req.body.password, rows[0].Password);
        console.log("isUserAuthenticated: " + isUserAuthenticated);
        if (isUserAuthenticated) {
          //This is to check if the user is logging in for the 1st time after a temp password was sent to them
          if (rows[0].U_TempPasswordFlag === "Y") {
            res.send({
              tempPasswordFlag: true,
              //InternalKey: rows[0].InternalKey,
              UserName: rows[0].UserName,
            });
          } else {
            const userId = rows[0].InternalKey;
            const {
              storeId,
              storeCounterId,
              counterCode,
              counterName,
              locationCode,
              storeLocation,
              storeWHCode,
            } = await getUserStoreInfo(userId);

            // Check if the Counter is already occupied by the user
            // NOT using this logic for now
            // const canAssign = await canAssignUserToCounter(userId, storeCounterId);

            //Set user info to the `session`
            req.session.userId = userId;
            //Store username & password for future login attempts when SL cookie expires
            req.session.userName = process.env.SERVICE_LAYER_USERNAME;
            req.session.password = process.env.SERVICE_LAYER_PASSWORD;
            req.session.slCookie = "";
            req.session.slLoginTime = "";
            req.session.userTIN = rows[0].Fax;
            req.session.displayUserName = rows[0].UserName;

            const clientHost = await getClientHostname(req);
            console.log(
              "validateUserLogin SL - req.connection.remoteAddress: ",
              req.connection.remoteAddress,
            );
            console.log("validateUserLogin SL - clientHost: ", clientHost);

            // Get User's default Sales Employee Code
            let userSalesEmployeeCode = "";
            const salesEmployee = await userHelper.getSalesEmployeeForUser(userId);
            if (Array.isArray(salesEmployee) && salesEmployee.length > 0) {
              userSalesEmployeeCode = salesEmployee[0].SlpCode;
            }

            let locationDefaults = "";
            // Get Store Location defaults
            if (storeLocation) {
              const response = await getLocationDefaults(storeLocation);
              if (Array.isArray(response) && response.length > 0) {
                locationDefaults = response[0];
              }
            }

            let userGroup = "";
            // Get Store Location defaults
            const groupResponse = await userHelper.getUserGroupByUser(userId);
            if (Array.isArray(groupResponse) && groupResponse.length > 0) {
              userGroup = groupResponse[0].U_GroupName;
            }

            const userSessionLog = {
              userId,
              userName: req.body.userName,
              userTIN: rows[0].Fax,
              displayUserName: rows[0].UserName,
              salesDisc: rows[0].SalesDisc,
              userSalesEmployeeCode,
              storeId: storeId ? storeId : null,
              storeCounterId: storeCounterId ? storeCounterId : null,
              counterCode,
              counterName,
              locationCode,
              storeLocation,
              locationDefaults,
              clientIp: clientHost,
              loginTime: formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2"),
              //NOTE: Removing the below prop or passing NULL thrown this error: cannot insert NULL or update to NULL: Not nullable "LogoutTime" column
              logoutTime: "",
            };

            const newSessionLog = await createUserSessionLog(userSessionLog);
            req.session.userSessionLog = newSessionLog;
            //Note: Adding `setStoreWHCode` to the session alone, WO adding to `UserLog` table
            req.session.storeWHCode = storeWHCode;
            // Adding `LocationCode` only to the session, will be used to filter WHs
            req.session.userSessionLog.locationCode = locationCode;

            const response = {
              InternalKey: userId,
              UserName: rows[0].UserName,
              UserTIN: rows[0].Fax,
              userSessionLog: newSessionLog,
              storeWHCode,
              userGroup,
              // eMail: rows[0].E_Mail,
              // UserCode: rows[0].UserCode,
              // MobilePhoneNumber: rows[0].MobileNo,
              permissions: [],
            };
            try {
              const permRows = userHelper.getUserPermissions(rows[0].InternalKey);
              // console.log("validateUserLogin - getUserPermissionsForAllModules %s", permRows);
              if (permRows) {
                //Set User permissions to the `session`
                req.session.permissions = permRows;
                response.permissions = permRows;
              }
              res.send(response);
            } catch (err) {
              console.log(
                "validateUserLogin - getUserPermissionsForAllModules - error: " +
                  JSON.stringify(err),
              );
              res.status(500).send({ message: err.message + ". Unable to get User Permissions" });
            }
          }
        }
      }
    }
    if (!isUserAuthenticated) {
      console.log("Invalid username/password!");
      next({ statusCode: 401, message: "Invalid username/password!" });
    }
  } catch (err) {
    console.log("validateUserLogin - controller - error: " + JSON.stringify(err));
    // res.status(500).send({message: err.message});
    next(err);
  }
};

const generateTempPassword = async (req, res, next) => {
  try {
    const result = userHelper.getUserInfo(req.body.internalKey);
    // const result = userHelper.getUserInfoWithUserNameMail(req.body.userName, req.body.mailId);

    if (result) {
      const tempPassword = await userHelper.setTemporaryPassword(req.body.internalKey);
      // console.log("tempPassword: ", tempPassword);
      if (tempPassword) {
        const mailBody = forgotPasswordTemplate.getMailBody(tempPassword);
        if (await sendMail(result.Email, forgotPasswordTemplate.subject, mailBody)) {
          console.log("Temporary password has been sent to the mailid");
        } else {
          console.log("Unable to send temporary password to the mailid!");
        }
        res.status(200).send({ tempPassword });
      } else {
        res.status(500).send({ message: "Unable to set temp password!" });
      }
    } else {
      console.log("Invalid user details!");
      res.status(500).send({ message: "Invalid user details. Please try again!" });
    }
  } catch (err) {
    console.log("generateTempPassword - controller - error: " + JSON.stringify(err));
    // res.status(500).send({message: err.message});
    next(err);
  }
};

const handleForgotPassword = async (req, res, next) => {
  try {
    // const rows = dbHelper.executeWithValues(query.validateUserEmail, [req.body.userName, req.body.mailId]);
    const userRec = userHelper.getUserInfoWithUserNameMail(req.body.userName, req.body.mailId);
    console.log("handleForgotPassword %s", JSON.stringify(userRec));
    if (userRec) {
      if (userRec.U_PortalAccountLocked === "Y") {
        console.log("userRec.U_PortalAccountLocked: " + userRec.U_PortalAccountLocked);
        res.status(401).send({ message: "Your account is locked. Please contact Admin!" });
      } else {
        const tempPassword = await userHelper.setTemporaryPassword(userRec.InternalKey);
        if (tempPassword) {
          const mailBody = forgotPasswordTemplate.getMailBody(tempPassword); //hashedPassword
          if (await sendMail(req.body.mailId, forgotPasswordTemplate.subject, mailBody)) {
            res.status(200).send({ message: "Temporary password has been sent to your email" });
          } else {
            //TODO: Need to show this message as "warning" in UI. If I send this msg with Error Code 400 or 500
            //msg will be shown in "orange", but Users list will be refreshed only when "success Code" is sent
            res.status(200).send({
              message: "Unable to send temporary password to your mail. Please contact Admin!",
            });
          }
        }
      }
    } else {
      console.log("Invalid user details!");
      res.status(401).send({ message: "Invalid user details. Please try again!" });
    }
  } catch (err) {
    console.log("handleForgotPassword - controller - error: " + JSON.stringify(err));
    res.status(500).send({ message: err.message });
  }
};

/**
 * Update portal password for New & Existing users.
 * For new users, this method updates teh password and returns the Permissions list as well (similar to /login API)
 * For existing users, it just updates the password and returns the message
 */
const updatePortalPassword = async (req, res) => {
  let response = {},
    isUserAuthenticated = false;
  const hashedNewPassword = await generateHash(req.body.newPassword);
  try {
    const rows = dbHelper.executeWithValues(query.validateUserLogin, [req.body.userName]);
    console.log("validateUserLogin %s", JSON.stringify(rows));
    if (Array.isArray(rows) && rows.length) {
      isUserAuthenticated = await comparePassword(req.body.password, rows[0].Password);
      if (isUserAuthenticated) {
        try {
          //tempPasswordFlag will be "Y" only when the pwd is set from Forgot Pwd page or when a pwd is set of new user
          const result = dbHelper.executeWithValues(query.updatePortalPassword, [
            hashedNewPassword,
            "N",
            rows[0].InternalKey,
          ]);
          console.log("updatePortalPassword %s", JSON.stringify(result));
          if (result > 0) {
            //if the Password Update request is from "Login" screen send back User's Permissions list
            if (req.body.screen && req.body.screen === "Login") {
              //Set user info to the `session`
              req.session.userName = rows[0].UserName;
              req.session.userId = rows[0].InternalKey;

              response = {
                InternalKey: rows[0].InternalKey,
                UserName: rows[0].UserName,
                // eMail: rows[0].E_Mail,
                // UserCode: rows[0].UserCode,
                // MobilePhoneNumber: rows[0].MobileNo,
                permissions: [],
              };
              try {
                const permRows = userHelper.getUserPermissions(rows[0].InternalKey);
                console.log("validateUserLogin - getUserPermissionsForAllModules %s", permRows);
                if (permRows) {
                  //Set User permissions to the `session`
                  req.session.permissions = permRows;

                  response.permissions = permRows;
                }
                res.send(response);
              } catch (err) {
                console.log(
                  "validateUserLogin - getUserPermissionsForAllModules - error: " +
                    JSON.stringify(err),
                );
                res.status(500).send({ message: err.message + ". Unable to get User Permissions" });
              }
            }
            //if the Password Update requrest is from "Profile" page
            else {
              res.status(200).send({ message: "Password updated successfully" });
            }
          }
        } catch (err) {
          console.log("updatePortalPassword - error: " + JSON.stringify(err));
          res.status(500).send({ message: "Password update failed!" });
        }
      }
    }
    if (!isUserAuthenticated) {
      console.log("Invalid username/password!");
      res.status(401).send({ message: "Invalid username/password!" });
    }
  } catch (err) {
    console.log("validateUserLogin - controller - error: " + JSON.stringify(err));
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get portal/non-portal users to display on User Details screen
 */
const getAllUsers = (req, res) => {
  try {
    const rows = dbHelper.executeWithValues(query.allUsers, [req.query.isPortalUser]);
    //console.log("getAllUsers %s", JSON.stringify(rows));
    res.send(rows);
  } catch (err) {
    console.log("getAllUsers - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err.message });
  }
};

/**
 * Gets a list of users under given 'User Group', sorted in ASC order based on UserName
 * @param {*} req
 * @param {*} res
 */
const getUsersByUserGroup = (req, res) => {
  try {
    const rows = userHelper.getUsersByUserGroup(req.params.groupName);
    res.send(rows);
  } catch (err) {
    console.log("getUsersByUserGroup - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err.message });
  }
};

//TODO: Combine all related controller methods in to a Single route, and send "req.params or req.query" to
//decide which sql query to execute

/**
 * Get Users list to load User dropdown in Approval Setup screen
 */
const getPortalUsersList = (req, res) => {
  try {
    dbHelper.executeQuery(query.portalUsers, (err, rows) => {
      if (err) throw err;
      console.log("getPortalUsersList %s", JSON.stringify(rows));
      res.send(rows);
    });
  } catch (err) {
    console.log("getPortalUsersList - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err.message });
  }
};

/**
 * Get Portal User Groups list
 */
const getAllPortalGroups = (req, res) => {
  try {
    dbHelper.executeQuery(query.portalUserGroups, (err, rows) => {
      if (err) throw err;
      console.log("getAllPortalGroups %s", JSON.stringify(rows));
      res.send(rows);
    });
  } catch (err) {
    console.log("getAllPortalGroups - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err });
  }
};

/**
 * ZZZZ NOT Used. Using "getAllPortalGroups" instead.
 * Get all Portal User Groups with their permissions
 */
const getPortalUserGroups = (req, res) => {
  try {
    getAllUserGroupsWithPermissions((userGroups) => {
      console.log("getPortalUserGroups - userGroups: " + JSON.stringify(userGroups));
      res.send(userGroups);
    });
  } catch (err) {
    console.log("getPortalUserGroups - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err.message });
  }
};

/**
 * Helper method to get all Portal User Groups with their permissions
 */
const getAllUserGroupsWithPermissions = (callback) => {
  try {
    dbHelper.executeQuery(query.userGroupsWithPermissions, (err, rows) => {
      if (err) throw err;
      // console.log("getAllUserGroupsWithPermissions %s", JSON.stringify(rows));
      callback(rows);
    });
  } catch (err) {
    console.log("getAllUserGroupsWithPermissions - controller - error: " + JSON.stringify(err));
    throw err;
  }
};

/**
 * Gets the list of Permissions for a given 'UserId' for all Modules
 * @param {*} req
 * @param {*} res
 */
const getUserPermissions = (req, res, next) => {
  try {
    const rows = userHelper.getUserPermissions(req.params.userId);
    res.send(rows);
  } catch (err) {
    console.log("getUserPermissions - controller - error: " + JSON.stringify(err));
    // res.status(500).send({error: err.message});
    next(err);
  }
};

/**
 * Get Permissions for the passed GroupId
 */
const getPortalUserPermissions = (req, res) => {
  console.log("req.params: %s", JSON.stringify(req.params));
  try {
    dbHelper.executeQuery(
      `${query.userPermissionsForGivenGroup}'${req.params.id}'`,
      (err, rows) => {
        if (err) throw err;
        console.log("getPortalUserPermissions %s", JSON.stringify(rows));
        res.send(rows);
      },
    );
  } catch (err) {
    console.log("getPortalUserPermissions - controller - error: " + JSON.stringify(err));
    // res.status(500).send({error: err.message});
    next(err);
  }
};

/**
 * Create Portal User Group with Permission
 */
const createUpdateUserGroupWithPermissions = (req, res, next) => {
  console.log("req.body: %s", JSON.stringify(req.body));
  /** Enclosing values within '' Single quotes is not required as below. It inserts quotes to the db too
    `'${req.body.U_GroupName}'`
   */
  let permissionId,
    result = 0;
  let permissionValuesForInsert = [],
    permissionValuesForUpdate = [];

  //set UPDATE query as default
  let userGroupQuery = query.updateUserGroup;

  let groupId = req.body.U_GroupId;
  //set a primary key & change the query as INSERT
  if (!groupId) {
    groupId = parseInt(getRandomNo());
    userGroupQuery = query.insertUserGroup;
  }
  const userGroupValues = [groupId, req.body.U_GroupName, req.body.U_GroupName, groupId];
  console.log("userGroupValues: " + userGroupValues);
  req.body.permissionsList.forEach((rec) => {
    permissionId = rec.U_PermissionId;
    if (!permissionId) {
      permissionId = parseInt(getRandomNo());
      permissionValuesForInsert.push([
        permissionId,
        permissionId,
        groupId,
        rec.U_ModuleId,
        rec.U_AllowRead,
        rec.U_AllowWrite,
        rec.U_AllowCancel,
        rec.U_AllowCreate,
        permissionId,
      ]);
    } else {
      permissionValuesForUpdate.push([
        permissionId,
        permissionId,
        groupId,
        rec.U_ModuleId,
        rec.U_AllowRead,
        rec.U_AllowWrite,
        rec.U_AllowCancel,
        rec.U_AllowCreate,
        permissionId,
      ]);
    }
  });

  try {
    //Create the User Group and add new Permissions to it
    const rows = dbHelper.executeWithValues(userGroupQuery, userGroupValues);
    if (rows) {
      const insertRows = dbHelper.executeBatchInsertUpdate(
        query.insertPermissions,
        permissionValuesForInsert,
      );
      result += insertRows;
      console.log("insertPermissions insertRows: " + insertRows);
      const updateRows = dbHelper.executeBatchInsertUpdate(
        query.updatePermissions,
        permissionValuesForUpdate,
      );
      result += updateRows;
      console.log("updatePermissions updateRows: " + updateRows);
      console.log("createUpdateUserGroupWithPermissions result: " + result);
      //if records are created or updated successfully send back the updated User Groups list
      if (result > 0) {
        getAllUserGroupsWithPermissions((userGroups) => {
          res.send(userGroups);
        });
      } else {
        res.status(201).send({});
      }
    } else {
      console.log(
        "createUpdateUserGroupWithPermissions -inner catch - error: " + JSON.stringify(err),
      );
      res.status(500).send({ message: "Unable to create new User Group" });
    }
  } catch (err) {
    console.log(
      "createUpdateUserGroupWithPermissions - controller - error: " + JSON.stringify(err),
    );
    //res.status(500).send({error: err.message});
    next(err);
  }
};

/**
 * Delete Portal User Group along with Permissions
 */
const deletePortalUserGroup = (req, res, next) => {
  console.log("req.param.id: %s", req.params.id);
  try {
    //Check if users exist in this Group before deleting it
    dbHelper.executeQuery(`${query.usersInGivenGroup}'${req.params.id}'`, (err, rows) => {
      if (err) throw err;
      else if (Array.isArray(rows) && rows.length) {
        //get the list of users that are currently present in this group
        const users = rows.map((row) => {
          return row.UserName;
        });
        res.status(400).send({
          users,
          error: "Please remove the users from this Group to delete it",
        });
      } else {
        //Delete the permissions under the User Group and then the User Group
        dbHelper.executeQuery(`${query.deletePermissions}'${req.params.id}'`, (err, rows) => {
          if (err) throw err;
          else {
            console.log("deletePermission rows: " + rows);
            dbHelper.executeQuery(`${query.deleteUserGroup}'${req.params.id}'`, (err, rows) => {
              if (err) res.status(500).send({ err });
              //if the record is deleted successfully send the updated User Groups list
              else if (rows > 0) {
                // getAllUserGroupsWithPermissions(userGroups => {
                //   console.log("getPortalUserGroups - userGroups: "+JSON.stringify(userGroups));
                //   res.status(200).send(userGroups);
                // });

                res.status(200).send("Success!");
              } else {
                console.log("deletePortalUserGroup %s", rows);
                res.status(201).send({ rows });
              }
            });
          }
        });
      }
    });
  } catch (err) {
    console.log("deletePortalUserGroup - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err.message });
  }
};

module.exports = {
  validateUserLogin,
  generateTempPassword,
  updatePortalPassword,
  handleForgotPassword,
  getAllUsers,
  getUsersByUserGroup,
  getAllPortalGroups,
  getPortalUserGroups,
  getPortalUserPermissions,
  getUserPermissions,
  getPortalUsersList,
  createUpdateUserGroupWithPermissions,
  deletePortalUserGroup,
};
