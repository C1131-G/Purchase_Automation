const { serviceLayerAPI } = require("../config/service-layer-api");
const { portalModules, serviceLayerApiURIs } = require("../config/config");

const moduleName = portalModules.INVENTORY_COUNTING;
const serviceLayerURI = serviceLayerApiURIs[moduleName];

exports.createInventoryCounting = async (request, cookie) => {
  try {
    if (request.branchId) {
      request.BPL_IDAssignedToInvoice = request.branchId; //BranchID
      delete request.branchId;
    }

    console.log("*** InventoryCounting request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.post(serviceLayerURI, request);
    console.log(`Create InventoryCounting response: ${JSON.stringify(response.data)}`);

    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    console.log("Create InventoryCounting error: " + error);
    throw error;
  }
};

exports.updateInventoryCounting = async (request, cookie) => {
  try {
    console.log("*** InventoryCounting update request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    const response = await serviceLayerAPI.patch(
      `${serviceLayerURI}(${request.DocumentEntry})`,
      request,
    );
    // console.log(`Update InventoryCounting response: ${response.status}`);

    if (response) {
      return true;
    }
    return false;
  } catch (error) {
    console.log("Create InventoryCounting error: " + error);
    throw error;
  }
};
