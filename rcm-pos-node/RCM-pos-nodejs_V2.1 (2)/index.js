require("dotenv").config();
const webServer = require("./app/services/web-server.js");
const database = require("./app/services/database.js");

// const startup = async() => {
//   try {
//     console.log('Initializing Web server');
//     await webServer.initialize();
//   }
//   catch (err) {
//     console.error(err);
//     process.exit(1); // Non-zero failure code
//   }
// }
// AFTER
const startup = async () => {
  try {
    // --- START OF THE FIX ---

    console.log("Initializing database module");
    // We need to wait for the dataSource inside the imported database module to initialize
    await database.dataSource.initialize();
    console.log("Database has been initialized by TypeORM!");

    // --- END OF THE FIX ---

    console.log("Initializing Web server");
    await webServer.initialize();
  } catch (err) {
    console.error(err);
    process.exit(1); // Non-zero failure code
  }
};

startup();

const shutdown = async (e) => {
  let err = e;
  console.log("Shutting down...");
  try {
    console.log("Closing Web server");
    await webServer.close();
  } catch (e) {
    console.log("Encountered error when closing Web server", e);
    err = err || e;
  }

  console.log("Exiting process");
  if (err) {
    process.exit(1); // Non-zero failure code
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => {
  console.log("Received SIGTERM");
  shutdown();
});

process.on("SIGINT", () => {
  console.log("Received SIGINT");
  shutdown();
});

process.on("uncaughtException", (err) => {
  console.log("Uncaught exception");
  console.error(err);

  shutdown(err);
});
