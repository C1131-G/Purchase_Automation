const session = require("express-session");
const connectRedis = require("connect-redis");
const fileStore = require("session-file-store");
const {
  sessionStoreTypes,
  sessionStore,
  cookieName,
  sessionSecret,
  sessionMaxAgeInHours,
} = require("../config/config");
const { redisClient } = require("../services/redis.js");

let store = "";
if (sessionStore === sessionStoreTypes.REDIS) {
  const RedisStore = connectRedis(session);
  store = new RedisStore({ client: redisClient });
} else if (sessionStore === sessionStoreTypes.FILE) {
  const FileStore = fileStore(session);
  store = new FileStore({
    ttl: 60 * 60 * parseInt(sessionMaxAgeInHours), //Session Time-to-Live in Seconds
    // secret: sessionSecret //to encrypt/hash the contents in the Session file
  });
}

const expressSession = session({
  store,
  name: cookieName, //Name of the cookie that stores the sessionID in the Browser. Default value: `connect.sid`
  secret: sessionSecret, //Key to `sign` the cookie (hash the sessionID) before sending it to FE via above cookie
  resave: false, //`true` forces the session to be saved back to the session store, even if the session was never modified during the request
  saveUninitialized: false,
  rolling: true, // Enable "rolling" sessions, i.e., Session expiry will be reset on every request
  cookie: {
    //`secure` attribute must be true, when `SameSite=None`
    //secure: true,//rvin // if true only transmit cookie over https
    secure: false, //rvin
    sameSite: "lax",
    httpOnly: true, // `true` prevents client side JS from reading the cookie
    maxAge: 1000 * 60 * 60 * parseInt(sessionMaxAgeInHours), //Session Max Age in Miliseconds
  },
});

module.exports = expressSession;
