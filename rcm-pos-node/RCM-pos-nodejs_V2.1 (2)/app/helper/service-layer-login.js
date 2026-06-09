const { serviceLayerAPI } = require("../config/service-layer-api");
const { dbCreds, serviceLayerSessionMaxAge } = require("../config/hana-db.js");
const { getTimeDifference } = require("../utils/utils");

/**
 * Returns a Service Layer connection if it exists or creates a new one & returns it
 * @param {Request} req
 * @returns
 */
const getSLConnection = async (req) => {
  try {
    if (req.session.slCookie && req.session.slLoginTime) {
      const timeiff = getTimeDifference(new Date(), new Date(req.session.slLoginTime));
      if (timeiff < serviceLayerSessionMaxAge) {
        return req.session.slCookie;
      }
    }

    const slCookie = await openSLConnection(req.session.userName, req.session.password);
    //Set the new SL cookie to `session` & reset the slLoginTime
    req.session.slCookie = slCookie;
    req.session.slLoginTime = new Date().toISOString();
    return slCookie;
  } catch (err) {
    throw err;
  }
};

/**
 * Opens a connection to Service Layer & returns a `cookie`
 * @param {String} userName
 * @param {String} password
 * @returns
 */
const openSLConnection = async (userName, password) => {
  let cookie = null;
  try {
    const response = await serviceLayerAPI.post(
      "Login?prefer=return-no-content",
      // { CompanyDB: dbCreds.CompanyDB, UserName: userName, Password: password });//rvin
      {
        CompanyDB: dbCreds.CompanyDB,
        UserName: dbCreds.UserName,
        Password: dbCreds.Password,
      },
    );

    console.log(`***Login - openSLConnection - response: ${response}`);
    cookie = response.headers["set-cookie"]; //get cookie from Response
    console.log("cookie: " + cookie);
    //console.log("response.headers: "+ JSON.stringify(response.headers));
    console.log("response.data.SessionId: " + response.data.SessionId);
    /*if ((response.status == "200" || response.status == "201") && cookie !== null)
      return cookie;
    else*/
    return cookie;
  } catch (error) {
    console.log("openSLConnection - error:" + JSON.stringify(error));
    throw error;
  }
};

const openDBConnection = async () => {
  let cookie = null;
  try {
    const response = await serviceLayerAPI.post("Login?prefer=return-no-content", dbCreds);
    console.log(`***Login - openDBConnection - response: ${response}`);
    cookie = response.headers["set-cookie"]; //get cookie from Response
    console.log("cookie: " + cookie);
    //console.log("response.headers: "+ JSON.stringify(response.headers));
    console.log("response.data.SessionId: " + response.data.SessionId);
    /*if ((response.status == "200" || response.status == "201") && cookie !== null)
      return cookie;
    else*/
    return cookie;
  } catch (error) {
    console.log("openDBConnection - error:" + JSON.stringify(error));
    // if(res) {
    //   res.status(500).send({ message: err.message })
    // }
    // else {
    throw error;
    // }
  }
};

module.exports = { openDBConnection, openSLConnection, getSLConnection };
