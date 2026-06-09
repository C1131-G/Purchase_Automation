const { serviceLayerAPI } = require("../config/service-layer-api.js");
const { portalModules, serviceLayerApiURIs } = require("../config/config.js");

const moduleName = portalModules.INCOMING_PAYMENT;
const serviceLayerURI = serviceLayerApiURIs[moduleName];

exports.createIncomingPayment = async (request, cookie) => {
  try {
    request.DocObjectCode = "bopot_IncomingPayments";
    console.log("*** IncomingPayment request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.post(serviceLayerURI, request);
    console.log(`Create IncomingPayment response: ${JSON.stringify(response.data)}`);

    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    console.log("Create IncomingPayment error: " + error);
    throw error;
  }
};
