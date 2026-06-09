const cors = require("cors");

/** Allow CORS */
const getCORSOptions = () => {
  //Set up a whitelist and check against it
  const whitelist = [process.env.REACT_APP_URL]; //["http://localhost:3001", "http://localhost:5050"];
  //const whitelist = ["https://www.neo.transformers.lk:5050", "https://neo.transformers.lk:5050"];
  //console.log("process.env.NODE_ENV: "+ process.env.NODE_ENV);
  console.log("whitelist: " + JSON.stringify(whitelist));
  // const corsOptions = {
  //   /** to pass Access-Control-Allow-Credentials CORS header,
  //    * to allow cookies to be included on cross-origin requests */
  //   credentials: true,
  //   allowedHeaders: ["Content-Type", "Authorization"],
  //   origin: (origin, callback) => {
  //     // console.log("origin: "+ origin);
  //     if(process.env.NODE_ENV === "development") {
  //       callback(null, true); //disable CORS for Dev
  //     }
  //     else {
  //       if (whitelist.indexOf(origin) !== -1 || !origin) {
  //         callback(null, true);
  //       }
  //       else {
  //         callback(new Error("Not allowed by CORS"));
  //       }
  //     }
  //   }
  // };
  const corsOptions = {
    /** to pass Access-Control-Allow-Credentials CORS header,
     * to allow cookies to be included on cross-origin requests */
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    origin: "http://localhost:4001", // Reverted to HTTP for local dev
  };
  console.log("corsOptions: ", corsOptions);
  return cors(corsOptions);
};

module.exports = getCORSOptions;
