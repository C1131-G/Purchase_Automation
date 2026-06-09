const { getSLConnection } = require("../helper/service-layer-login");
const serviceLayerHelper = require("../helper/service-layer-credit-memo");

const create = async (req, res, next) => {
  try {
    const cookie = await getSLConnection(req);
    const response = await serviceLayerHelper.createCreditMemo(req.body, cookie);
    res.status(200).send({ DocNum: response.DocNum });
    // res.status(200).send(response); //added for testing
  } catch (error) {
    console.log("create CreditMemo Controller: " + JSON.stringify(error));
    next(error);
  }
};

module.exports = { create };
