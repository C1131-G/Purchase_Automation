const { serviceLayerAPI } = require("../config/service-layer-api");
const { portalModules, serviceLayerApiURIs } = require("../config/config");

const moduleName = portalModules.SALES_QUOTATION;
const serviceLayerURI = serviceLayerApiURIs[moduleName];

exports.createSalesQuotation = async (request, cookie) => {
  try {
    if (request.branchId) {
      request.BPL_IDAssignedToInvoice = request.branchId; //BranchID
      delete request.branchId;
    }

    console.log("*** SalesQuotation request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.post(serviceLayerURI, request);
    console.log(`Create SalesQuotation response: ${JSON.stringify(response.data.DocNum)}`);

    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    console.log("Create SalesQuotation error: " + error);
    throw error;
  }
};

exports.updateSalesQuotation = async (request, cookie) => {
  try {
    console.log("*** SalesQuotation update request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    // Patch op. returns 204, No Content response. `response.data` will be empty.
    const response = await serviceLayerAPI.patch(
      `${serviceLayerURI}(${request.DocEntry})`,
      request,
    );
    // console.log(`Update SalesQuotation response: ${response.status}`);

    if (response) {
      return true;
    }
    return false;
  } catch (error) {
    console.log("update SalesQuotation error: " + error);
    throw error;
  }
};

exports.getSalesQuotation = async (docEntry, cookie) => {
  try {
    console.log("*** SalesQuotation get request: " + JSON.stringify(docEntry));
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    const response = await serviceLayerAPI.get(`${serviceLayerURI}(${docEntry})`);
    // console.log(`get SalesQuotation response: ${response.status}`);

    if (response) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.log("get SalesQuotation error: " + error);
    throw error;
  }
};

exports.putSalesQuotation = async (docEntry, request, cookie) => {
  try {
    console.log("*** SalesQuotation put request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    // put op. returns 204, No Content response. `response.data` will be empty.
    const response = await serviceLayerAPI.put(`${serviceLayerURI}(${docEntry})`, request);
    // console.log(`put SalesQuotation response: ${response.status}`);

    if (response) {
      return true;
    }
    return false;
  } catch (error) {
    console.log("put SalesQuotation error: " + error);
    throw error;
  }
};
