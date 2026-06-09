const { cookieName, httpStatusCodes, recordState } = require("../config/config");
const { formatDate } = require("../utils/utils");
const { updateUserSessionLog } = require("../entities/services/user-session-log.service");

/**
 * Gets the Username & Permission from `session`
 **/
exports.get = async (req, res, next) => {
  try {
    const { permissions, userName, userId, userSessionLog, storeWHCode, userTIN } = req.session;
    res.send({ permissions, userName, userId, userSessionLog, storeWHCode, userTIN });
  } catch (err) {
    console.error("Error getting Session data!");
    next(err);
  }
};

/**
 * Destroy the `session` and clears the cookie
 **/
exports.delete = async (req, res, next) => {
  console.log("Destroying session!");
  // console.log("req.session: ", req.session);
  try {
    if (req.session && req.session.cookie) {
      //Set the Logout Time & Session status
      if (req.session.userSessionLog && req.session.userSessionLog.userSessionLogId) {
        const updatedLog = {
          sessionStatus: recordState.INACTIVE,
          logoutTime: formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2"),
        };
        await updateUserSessionLog(req.session.userSessionLog.userSessionLogId, updatedLog);
      }
      res.clearCookie(cookieName, { path: "/" });

      req.session.destroy((err) => {
        if (err) {
          throw err;
        }
      });
    }
    res.status(httpStatusCodes.OK).json({ message: "Logged out successfully!" });
  } catch (err) {
    console.error("Error destroying session!");
    next(err);
  }
};
