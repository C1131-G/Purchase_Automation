import { serviceLayerClient } from "./src/services/service-layer.service.js";
import { masterDataService } from "./src/services/master-data.service.js";

async function run() {
  try {
    const sessionId = (await serviceLayerClient.login("AJAX_POS_DB", "manager", "1234")).SessionId; // Just kidding, I don't know the password
  } catch (err) {
  }
}
run();
