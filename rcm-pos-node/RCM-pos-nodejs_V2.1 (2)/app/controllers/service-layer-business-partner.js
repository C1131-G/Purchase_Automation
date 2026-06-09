const { getSLConnection } = require("../helper/service-layer-login");
const serviceLayerHelper = require("../helper/service-layer-business-partner");

const create = async (req, res, next) => {
  try {
    const cookie = await getSLConnection(req);
    const response = await serviceLayerHelper.createBusinessPartner(req.body, cookie);
    res.status(200).send({ CardCode: response.CardCode });
  } catch (error) {
    console.log("create Biz Partner: " + JSON.stringify(error));
    next(error);
  }
};

module.exports = { create };
