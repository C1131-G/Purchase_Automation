import { serviceLayerClient } from "./src/services/service-layer.service";

(async () => {
  try {
    const session = await serviceLayerClient.login("ND_Vendor_Portal", "OEC1", "1234");
    const doc = await serviceLayerClient.request(
      session.sessionId,
      "GET",
      "/Quotations?$filter=DocNum eq 1005758",
    );
    console.log(JSON.stringify(doc.value[0].DocumentLines[0], null, 2));
  } catch (e) {
    console.error(e);
  }
})();
