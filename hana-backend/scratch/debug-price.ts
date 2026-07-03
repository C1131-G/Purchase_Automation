import { getSession } from "../src/services/auth.service.js";
import { serviceLayerClient } from "../src/services/service-layer.service.js";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  try {
    const sessionId = await getSession();
    if (!sessionId) {
      console.log("NO SESSION");
      return;
    }
    const meta = await serviceLayerClient.request(sessionId, "GET", "/$metadata");
    // Let's just find the properties of Document for Goods Issue
    const fs = require("fs");
    fs.writeFileSync("metadata.xml", meta);
    console.log("Metadata written");
  } catch (err) {
    console.error("ERROR DETECTED:", err);
  }
}
run().then(() => process.exit(0));
