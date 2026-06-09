const { serviceLayerAPI } = require("../config/service-layer-api");
const { portalModules, serviceLayerApiURIs } = require("../config/config");

const moduleName = portalModules.BUSINESS_PARTNER;
const serviceLayerURI = serviceLayerApiURIs[moduleName];

exports.createBusinessPartner = async (request, cookie) => {
  console.log(`request: ${JSON.stringify(request)}`);
  try {
    if (request.branchId) {
      request.BPL_IDAssignedToInvoice = request.branchId; //BranchID
      delete request.branchId;
    }

    console.log("*** BusinessPartner request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.post(serviceLayerURI, request);
    // console.log(`Create BusinessPartner response: ${JSON.stringify(response.data)}`);

    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    console.log("Create BusinessPartner error: " + error);
    throw error;
  }
};

// module.exports = { createBusinessPartner };
