const bunyan = require("bunyan");
const path = require("path");
const { formatDate } = require("../utils/utils");

const init = () => {
  const logPath = path.resolve(__dirname, "../../logs/pos.json");

  const env = process.env.NODE_ENV || "production";
  //const level = bunyan.levelFromName[process.env.LOG_LEVEL] || (env === "production" ? "warn" : "info");
  // const level = bunyan.ERROR;

  const bunyanLog = bunyan.createLogger({
    dateTime: formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS"), //formatDate(new Date(), "YYYY-MM-DD hh:mm"),
    name: "POS",
    streams: [
      {
        level: bunyan.INFO,
        stream: process.stdout,
      },
      {
        level: bunyan.ERROR,
        type: "rotating-file",
        path: logPath,
        period: "1d", // daily rotation
        count: 5, // keep 5 back copies
      },
    ],
  });

  // bunyanLog.error("Bunyan logger initialized..");
  console.log("Bunyan logger initialized..");

  return bunyanLog;
};

const logError = (opt) => {
  try {
    const bunyanLogger = init();
    bunyanLogger.error(opt);
  } catch (err) {
    console.log("Error initializing Bunyan Logger: ", JSON.stringify(err));
  }
};

module.exports = { logError };
