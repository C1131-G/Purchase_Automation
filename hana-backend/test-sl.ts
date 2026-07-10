import { serviceLayerClient } from "./src/services/service-layer.service.js";
import fs from "fs";

async function run() {
  try {
    const loginResp = await serviceLayerClient.login("AJAX_POS_DB", "manager", "1234"); // I don't know the B1 password, let me check .env or just use B1S session from cookies
  } catch (err) {
    console.error(err);
  }
}
run();
