const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const { getRandomNo, formatDate, getClientHostname } = require("../utils/utils");
const forgotPasswordTemplate = require("../mail-templates/forgot-password");
const { sendMail } = require("../helper/send-mail");
const { generateHash, comparePassword } = require("../utils/bcrypt.util.js");
const userHelper = require("../helper/users");
const { openSLConnection } = require("../helper/service-layer-login");
const { createUserSessionLog } = require("../entities/services/user-session-log.service");
const { getUserStoreInfo } = require("../helper/stores.js");
const { canAssignUserToCounter } = require("../helper/user-session-log.js");
const { getLocationDefaults } = require("../helper/locations.js");

/**
 * Validate user login
 */
exports.validateUserLogin = async (req, res, next) => {
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
        const slCookie = await openSLConnection(req.body.userName, req.body.password);
        console.log("slCookie: " + slCookie);

        if (slCookie) {
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

          isUserAuthenticated = true;
          //Set user info to the `session`
          req.session.userId = userId;
          //Store username & password for future login attempts when SL cookie expires
          req.session.userName = req.body.userName;
          req.session.password = req.body.password;

          req.session.slCookie = slCookie;
          req.session.slLoginTime = new Date();
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
            userGroup = groupResponse.U_GroupName;
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
            permissions: [],
          };
          try {
            const permRows = userHelper.getUserPermissions(userId);
            // console.log("validateUserLogin - getUserPermissionsForAllModules %s", permRows);
            if (permRows) {
              //Set User permissions to the `session`
              req.session.permissions = permRows;
              response.permissions = permRows;
            }
            res.send(response);
          } catch (err) {
            console.log(
              "validateUserLogin - getUserPermissionsForAllModules - error: " + JSON.stringify(err),
            );
            res.status(500).send({ message: err.message + ". Unable to get User Permissions" });
          }
        }
      }
    } else {
      console.log("Invalid username/password!");
      next({ statusCode: 401, message: "Invalid username/password!" });
    }
  } catch (err) {
    console.log("validateUserLogin - controller - error: " + JSON.stringify(err));
    // res.status(500).send({message: err.message});
    next(err);
  }
};
