const express = require("express");
const http = require("http");
//const https = require("https");     //rvin

const httpProxy = require("http-proxy");
//const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const rfs = require("rotating-file-stream");
const cluster = require("cluster");
const totalCPUs = require("os").cpus().length;
const cors = require("cors"); //rvin
const getCORSOptions = require("../config/cors");
const expressSession = require("../config/session.js");

const customAPI = require("../routes/custom-api.js");
const serviceLayer = require("../routes/service-layer");
const errorHandler = require("../handler/error-handler.js");
const { sessionValidator } = require("../handler/session-handler");
const businessPartnerServiceRoutes = require("../routes/business-partner-service-layer.routes.js");
const cashDenominationRoutes = require("../routes/cash-denominations.routes");
const creditCardRoutes = require("../routes/credit-card.routes");
const invoiceRoutes = require("../routes/invoice.routes");
const fircaRoutes = require("../routes/firca-routes");
const invoiceServiceRoutes = require("../routes/invoice-service-layer.routes");
const itemServiceRoutes = require("../routes/item-service-layer.routes.js");
const itemMasterRoutes = require("../routes/item-master.routes.js");
const stockTransferRequestRoutes = require("../routes/stock-transfer-request.routes.js");
const salesQuotationRoutes = require("../routes/sales-quotation.routes.js");
const salesQuotationServiceRoute = require("../routes/sales-quotation-service-layer.routes");
const saleOrderRoutes = require("../routes/sale-order.routes");
const taxRoutes = require("../routes/tax-custom.routes");
const salesEmployeesRoutes = require("../routes/sales-employees-custom.routes.js");
const userRoutes = require("../routes/user-custom.routes.js");
const paymentTermsRoutes = require("../routes/payment-terms-custom.routes.js");
const banksRoutes = require("../routes/banks-custom.routes.js");
const locationsRoutes = require("../routes/locations-custom.routes.js");
const warehouseRoutes = require("../routes/warehouse-custom.routes.js");
const customerRoutes = require("../routes/customer-custom.routes");
const creditMemoRoutes = require("../routes/credit-memo.routes");
const creditMemoServiceRoute = require("../routes/credit-memo-service-layer.routes");
const creditMemoRequestRoutes = require("../routes/credit-memo-request.routes.js");
const creditMemoRequestServiceRoute = require("../routes/credit-memo-request-service-layer.routes.js");
const inventoryCountingRoutes = require("../routes/inventory-counting.routes.js");
const inventoryCountingServiceRoute = require("../routes/inventory-counting-service-layer.routes");

const userGroupRoutes = require("../routes/user-groups.routes.js");
const storeRoutes = require("../routes/store.routes.js");
const parkedTransactionRoutes = require("../routes/parked-transactions.routes.js");
const sessionRoutes = require("../routes/session.routes.js");
const userSessionLogRoutes = require("../routes/user-session-log.routes.js");

//Samples
const qcItemGroupRoutes = require("../routes/qc-item-group.routes");
const deliveryRoutes = require("../routes/delivery-custom.routes.js");
const deliveryServiceRoutes = require("../routes/delivery-service-layer.routes.js");
const salesBatchSelectionServiceRoutes = require("../routes/sales-batch-selection-service-layer.routes.js");

let httpsServer;

const apiVersion = "v1";
const serviceLayerBaseURI = `/api/v1/service`;
const customBaseURI = `/api/v1/custom`;

const initialize = async () => {
  if (process.env.NODE_ENV === "development") {
    await startServer();
  } else {
    //Start multiple instances of the App in a non-Dev env.
    if (cluster.isMaster) {
      console.log(`Number of CPUs is ${totalCPUs}`);
      console.log(`Master ${process.pid} is running`);

      //Fork workers
      for (let i = 0; i < totalCPUs; i++) {
        cluster.fork();
      }

      cluster.on("exit", (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
        console.log("Let's fork another worker!");
        cluster.fork();
      });
    } else {
      await startServer();
    }
  }
};

const startServer = () => {
  return new Promise((resolve, reject) => {
    const app = express();
    const fs = require("fs");

    //
    const hostname = process.env.HOST;

    //Serve static file via Express
    if (process.env.NODE_ENV === "development") {
      app.use(express.static(path.join(__dirname, "../../", "build"))); //for Dev
      app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "../../", "build", "index.html"));
      });
    } else {
      app.use(express.static(path.join(__dirname, "../../../", "UI")));
      app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "../../../", "UI", "index.html"));
      });
    }

    //Adding Certificate & Key details for HTTPS
    //rvin-start
    // const options = {
    //   cert: fs.readFileSync(
    //     path.join(__dirname, "../../", process.env.SSL_CRT_FILE),
    //     "utf8"
    //   ),
    //   key: fs.readFileSync(
    //     path.join(__dirname, "../../", process.env.SSL_KEY_FILE),
    //     "utf8"
    //   ),
    // };
    //rvin-end

    //console.log("options: "+ JSON.stringify(options));
    const port = process.env.API_PORT || 2020;

    //httpsServer = https.createServer(options, app); //rvin
    httpsServer = http.createServer(app); //rvin

    //Set CORS options
    app.use(getCORSOptions()); //rvin
    //app.use(cors()); //rvin

    app.use(cookieParser());
    //Parse requests of content-type: application/json
    app.use(express.json());
    //Parse requests of content-type: application/x-www-form-urlencoded
    app.use(express.urlencoded({ extended: true }));

    // app.set("trust proxy", 1); // enable this if you run behind a proxy (nginx)

    //Configure session middleware
    app.use(expressSession);

    //Validate the session before allowing users to below routes

    //Register SL routes
    app.use(serviceLayerBaseURI, serviceLayer);
    app.use(`${customBaseURI}/session`, sessionRoutes);

    app.use(sessionValidator);

    app.use(`${serviceLayerBaseURI}/business-partner`, businessPartnerServiceRoutes);
    app.use(`${serviceLayerBaseURI}/invoice`, invoiceServiceRoutes);
    app.use(`${serviceLayerBaseURI}/sales-quotation`, salesQuotationServiceRoute);
    app.use(`${serviceLayerBaseURI}/credit-memo`, creditMemoServiceRoute);
    app.use(`${serviceLayerBaseURI}/credit-memo-request`, creditMemoRequestServiceRoute);
    app.use(`${serviceLayerBaseURI}/inventory-counting`, inventoryCountingServiceRoute);
    app.use(`${serviceLayerBaseURI}/item`, itemServiceRoutes);
    app.use(`${serviceLayerBaseURI}/sales-batch-selection`, salesBatchSelectionServiceRoutes);

    //Sample
    app.use(`${serviceLayerBaseURI}/delivery`, deliveryServiceRoutes);

    //Custom routes
    app.use(customBaseURI, customAPI);
    app.use(`${customBaseURI}/user/group`, userGroupRoutes);
    app.use(`${customBaseURI}/store`, storeRoutes);
    app.use(`${customBaseURI}/parked-transaction`, parkedTransactionRoutes);
    app.use(`${customBaseURI}/user-session-log`, userSessionLogRoutes);

    app.use(`${customBaseURI}/invoice`, invoiceRoutes);
    app.use(`${customBaseURI}/firca`, fircaRoutes);
    app.use(`${customBaseURI}/cash-denomination`, cashDenominationRoutes);
    app.use(`${customBaseURI}/credit-card`, creditCardRoutes);
    app.use(`${customBaseURI}/stock-transfer-request-new`, stockTransferRequestRoutes);
    app.use(`${customBaseURI}/sales-quotation`, salesQuotationRoutes);
    app.use(`${customBaseURI}/sale-order`, saleOrderRoutes);
    app.use(`${customBaseURI}/customer`, customerRoutes);
    app.use(`${customBaseURI}/tax`, taxRoutes);
    app.use(`${customBaseURI}/sales-employees`, salesEmployeesRoutes);
    app.use(`${customBaseURI}/payment-terms`, paymentTermsRoutes);
    app.use(`${customBaseURI}/user`, userRoutes);
    app.use(`${customBaseURI}/banks`, banksRoutes);
    app.use(`${customBaseURI}/locations`, locationsRoutes);
    app.use(`${customBaseURI}/warehouse`, warehouseRoutes);
    app.use(`${customBaseURI}/credit-memo`, creditMemoRoutes);
    app.use(`${customBaseURI}/credit-memo-request`, creditMemoRequestRoutes);
    app.use(`${customBaseURI}/inventory-counting`, inventoryCountingRoutes);
    app.use(`${customBaseURI}/item-master`, itemMasterRoutes);

    //Sample
    app.use(`${customBaseURI}/delivery`, deliveryRoutes);
    //w TypeORM
    app.use(`${customBaseURI}/qc-item-group`, qcItemGroupRoutes);

    //Global Error Handler
    app.use(errorHandler);

    //Set port & listen for requests
    httpsServer
      .listen(port, hostname)
      .on("listening", () => {
        console.log(`Web server listening on ${port}`);
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

const close = () => {
  return new Promise((resolve, reject) => {
    httpsServer.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

module.exports = { initialize, close };
