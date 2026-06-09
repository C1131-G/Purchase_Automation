require("dotenv").config();
const express = require("express");
const https = require("https");
const path = require("path");
const fs = require("fs");

const app = express();

// Serve static files from the build folder
app.use(express.static(path.join(__dirname, "build")));

// Serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start the HTTPS server
const port = process.env.PORT || 6601;
const sslOptions = {
  cert: fs.readFileSync(path.join(__dirname, process.env.SSL_CRT_FILE)),
  key: fs.readFileSync(path.join(__dirname, process.env.SSL_KEY_FILE)),
};

https.createServer(sslOptions, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
