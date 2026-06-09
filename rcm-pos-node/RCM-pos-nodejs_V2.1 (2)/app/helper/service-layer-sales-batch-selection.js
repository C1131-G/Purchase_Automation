const { serviceLayerAPI } = require("../config/service-layer-api");
const { portalModules, serviceLayerApiURIs } = require("../config/config");

const serviceLayerURI = portalModules.OSBS;

exports.getSalesBatchSelection = async (docNum, itemCode, cookie) => {
  try {
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.get(
      `${serviceLayerURI}?$filter=U_InvNo eq '${docNum}' and U_ItemCode eq '${itemCode}'`,
    );
    if (Array.isArray(response?.data?.value) && response.data.value.length > 0) {
      return response.data.value[0];
    }
    return null;
  } catch (error) {
    console.log("Get SalesBatchSelection error: " + error);
    throw error;
  }
};

exports.updateSalesBatchSelection = async (request, cookie) => {
  try {
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.patch(
      `${serviceLayerURI}(${request.DocEntry})`,
      request,
    );
    return response.data;
  } catch (error) {
    console.log("Update SalesBatchSelection error: " + error);
    throw error;
  }
};

exports.createSalesBatchSelection = async (request, invoiceDocEntry, invoiceDocNum, cookie) => {
  console.log("*** SalesBatchSelection request: " + JSON.stringify(request));
  // Ensure `request` is an array
  const requests = Array.isArray(request) ? request : [request];
  const results = [];
  for (const item of requests) {
    try {
      serviceLayerAPI.defaults.headers.Cookie = cookie;
      item.U_InvNo = invoiceDocNum;
      const response = await serviceLayerAPI.post(serviceLayerURI, item);
      //const response = await axios.post('/OSBS', item);
      // Extract required fields from the response
      const { DocNum, LineNum, U_ItemCode } = response.data;
      console.log("*** SalesBatchSelection response:**** " + JSON.stringify(response.data));
      results.push({ DocNum, LineNum, U_ItemCode });
    } catch (error) {
      console.error(
        `Error creating OSBS record for item ${item.ItemCode}:`,
        error.response?.data?.error?.message?.value,
      );
    }
  }

  return results;

  //   try {
  //     console.log("*** SalesBatchSelection request: "+JSON.stringify(request));
  //     serviceLayerAPI.defaults.headers.Cookie = cookie;
  //     const response = await serviceLayerAPI.post(serviceLayerURI, request);
  //     console.log(`Create SalesBatchSelection response: ${JSON.stringify(response.data.DocNum)}`);

  //     if(response.data) {
  //       return response.data;
  //     }
  //     return;
  //   }
  //   catch(error){
  //     console.log("Create SalesBatchSelection error: "+ error);
  //     throw error;
  //   }
};
