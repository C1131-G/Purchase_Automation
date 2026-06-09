const { serviceLayerAPI } = require("../config/service-layer-api.js");
const { portalModules, serviceLayerApiURIs } = require("../config/config.js");

const moduleName = portalModules.ITEM;
const serviceLayerURI = serviceLayerApiURIs[moduleName];

exports.createItem = async (request, cookie) => {
  try {
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.post(serviceLayerURI, request);
    // console.log(`Create Item response: ${JSON.stringify(response.data)}`);

    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    console.log("Create Item Helper error: " + error);
    throw error;
  }
};
