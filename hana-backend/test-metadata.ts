import { serviceLayerClient } from "./src/services/service-layer.service.js";

async function run() {
  try {
    // Just fetch metadata from b1s directly, we might not need login for $metadata
    const resp = await fetch("https://172.18.30.114:50000/b1s/v1/$metadata", {
      headers: {
        Cookie: "B1SESSION=fake; ROUTEID=.node1",
      },
    });
    const text = await resp.text();
    console.log(text.substring(0, 100));
  } catch (err) {
    console.error(err);
  }
}
run();
