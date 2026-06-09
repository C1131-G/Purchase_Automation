const dbHelper = require("./db");
const { itemTypes, draftStatus, portalModules } = require("../config/config");

/**
 * Get a Draft record via Service Layer based on DocEntry
 * @param {*} docEntry
 * @param {*} serviceLayer
 * @returns
 */
exports.getDraft = async (docEntry, serviceLayer = null) => {
  try {
    //TODO: Check for this msg. in the `catch` block before opening a new SL conn.
    //error.message.value: "Invalid session or session already timeout."

    /*if(!serviceLayer) {
      serviceLayer = serviceLayerAPI;
      const cookie = await openDBConnection();
      if (cookie) {
        serviceLayer.defaults.headers.Cookie = cookie;
      }
    }*/

    let response = await serviceLayer.get(`Drafts(${docEntry})`);
    return response.data;
  } catch (err) {
    throw err;
  }
};
