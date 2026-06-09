import mock from "./mock";

//data files
import "./data/PurchaseOrders";
import "./data/Items";
import "./data/Warehouse";
import "./data/BinLocation";
import "./data/Users";

// console.log("Starting Mock API server...");
mock.onAny().passThrough();
