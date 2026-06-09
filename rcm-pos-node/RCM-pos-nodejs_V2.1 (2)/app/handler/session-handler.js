const { httpStatusCodes } = require("../config/config");
const { formatDate } = require("../utils/utils");

/**
 * Validates the current session & permits users to access the requested URI if it's valid
 * or sends 401 error to the client
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const sessionValidator = (req, res, next) => {
  // console.log("sessionValidator: req Obj.: ", req.session);
  const { permissions, userName, userId } = req.session;

  //Block users from accessing the resources (other than /login API) if the session is INVALID
  if (
    !req.url.endsWith("/login") &&
    !req.url.endsWith("/update-password") &&
    !req.url.endsWith("/forgot-password") && //&& !req.url.endsWith("/session")
    (!userName || !userId || !Array.isArray(permissions) || permissions.length === 0)
  ) {
    console.log("sessionValidator - session is INVALID");
    res
      .status(httpStatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid session. Login to continue!" });
  } else {
    console.log("sessionValidator - session is VALID!");
    //Adding `userId` to the request body causes error when performing CREATE op. on TypeORM entities
    //as typeORM tries to insert `userId` to the table as well, where a col. named `userId` is not available.
    //FIX: Replaced `req.body.userId` with `req.session.userId` in ALL the controller & helper files
    // req.body.userId = req.session.userId;

    //ZZZ Added for entities created via TypeORM - moved the logic to separate controllers
    //this adds the props only when an obj. is sent as payload, doesnt work when an array is sent.

    // if(req.url.includes("/custom/")) {
    //   if(req.method === "POST") {
    //     req.body.createdBy = req.session.userId;
    //     req.body.createdAt = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
    //   }
    //   else if (["PUT", "PATCH"].includes(req.method)) {
    //     req.body.modifiedBy = req.session.userId;
    //     req.body.modifiedAt = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
    //   }
    // }
    next();
  }
};

/**
 * Checks if the user has permission to perform the requested Operation on a given Module
 * @param {*} moduleName
 * @param {*} permission
 * @returns
 */
const checkUserPermission = (moduleName, permission) => {
  return [
    //Authorize based on User Permission
    (req, res, next) => {
      //Make it an Array if it is not
      if (!Array.isArray(moduleName)) {
        moduleName = [moduleName];
      }
      try {
        let hasPermission = false;
        const { permissions } = req.session;
        // console.log("checkUserPermission - req.session %s", JSON.stringify(permissions));
        // console.log("checkUserPermission - moduleName %s", moduleName);
        // console.log("checkUserPermission - permission %s", permission);
        if (Array.isArray(permissions) && permissions.length) {
          /**
           * Sample array with Module Names & permissions 
                [{"U_ModuleName": "Stock Transfer Request", "U_AllowRead":"N","U_AllowWrite":"N","U_AllowCancel":"N","U_AllowCreate":"N"},
                  {"U_ModuleName": "Issue for Production", "U_AllowRead":"Y","U_AllowWrite":"Y","U_AllowCancel":"N","U_AllowCreate":"Y"}]
           * User will be allowed to access the requested route when the permission is 'Y' for 
           * atleast one of the Modules passed.
           */
          if (
            permissions.find(
              (perm) => moduleName.includes(perm.U_ModuleName) && perm[permission] === "Y",
            )
          ) {
            hasPermission = true;
          }
        }
        //Authorization successful
        if (hasPermission) {
          next();
        } else {
          res
            .status(httpStatusCodes.FORBIDDEN)
            .send({ message: "User unauthorized to perform the operation" });
        }
      } catch (err) {
        console.log("checkUserPermission - controller - error: " + JSON.stringify(err));
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: err.message });
      }
    },
  ];
};

module.exports = { sessionValidator, checkUserPermission };
