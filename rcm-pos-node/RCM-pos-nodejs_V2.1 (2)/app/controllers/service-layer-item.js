const { getSLConnection } = require("../helper/service-layer-login.js");
const serviceLayerHelper = require("../helper/service-layer-item.js");

const create = async (req, res, next) => {
  try {
    const cookie = await getSLConnection(req);
    console.log("*** Item request: " + JSON.stringify(req.body));
    const response = await serviceLayerHelper.createItem(req.body, cookie);
    res.status(200).send({ ItemCode: response.ItemCode });
  } catch (error) {
    console.log("create Item: " + JSON.stringify(error));
    next(error);
  }
};

module.exports = { create };
