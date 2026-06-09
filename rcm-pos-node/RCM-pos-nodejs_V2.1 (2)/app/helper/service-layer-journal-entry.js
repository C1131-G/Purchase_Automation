const { serviceLayerAPI } = require("../config/service-layer-api");
const { portalModules, serviceLayerApiURIs } = require("../config/config");

const moduleName = portalModules.JOURNAL_ENTRY;
const serviceLayerURI = serviceLayerApiURIs[moduleName];

exports.createJournalEntry = async (request, cookie) => {
  try {
    console.log("*** JournalEntry request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.post(serviceLayerURI, request);

    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    console.log("Create JournalEntry error: " + error);
    throw error;
  }
};
