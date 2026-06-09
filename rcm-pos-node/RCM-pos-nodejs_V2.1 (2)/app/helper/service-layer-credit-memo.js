const { serviceLayerAPI } = require("../config/service-layer-api");
const { portalModules, serviceLayerApiURIs } = require("../config/config");

const moduleName = portalModules.CREDIT_MEMO;
const serviceLayerURI = serviceLayerApiURIs[moduleName];

exports.createCreditMemo = async (request, cookie) => {
  try {
    if (request.branchId) {
      request.BPL_IDAssignedToInvoice = request.branchId; //BranchID
      delete request.branchId;
    }

    console.log("*** CreditMemo request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.post(serviceLayerURI, request);
    console.log(`Create CreditMemo response: ${JSON.stringify(response.data)}`);

    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    console.log("Create CreditMemo error: " + error);
    throw error;
  }
};
