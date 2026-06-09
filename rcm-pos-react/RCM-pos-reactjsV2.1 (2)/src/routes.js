import Dashboard from "views/Dashboard";
import UserDetails from "./views/UserDetails";
import StockTransferRequest from "views/StockTransferRequest";
import Report from "views/Reports";
import PrintQRCode from "./views/PrintQRCode";
import InventoryCounting from "./views/InventoryCounting/index.js";
import UserProfile from "./views/Profile.js";
import UserGroups from "./views/Setup/UserGroups";
import ApprovalTemplates from "./views/Setup/ApprovalTemplates";
import CreateDelivery from "./views/Delivery/Create";
import ViewDelivery from "./views/Delivery/View";
import CreateInvoice from "./views/Sales/Create";
import ViewInvoice from "./views/Sales/View";
import CreateReturns from "./views/Returns/Create";
import ViewReturns from "./views/Returns/View";
import CreateSalesQuotation from "views/SalesQuotation/Create";
import ViewSalesQuotation from "views/SalesQuotation/View";
import Stores from "./views/Stores";
import UsersSession from "./views/UsersSession";
import Pine from "./views/Pine";
import Logout from "views/Logout.js";

// import LGDelivery from "./views/Delivery_Lgn/Create";

import { portalModules, permissions } from "./config/config.js";

import IncomingPayment from "./views/TestDemo/IncomingPayment/Details";

const routes = [
  {
    name: "Setup",
    icon: "fa fa-cogs txt-primary",
    children: [
      {
        isSubMenu: true,
        path: "/setup/users",
        name: "Users",
        icon: "fas fa-user-plus txt-orange", //blue, pink ni ni-planet
        component: UserDetails,
        layout: "/u",
        module: portalModules.USER,
        permission: permissions.READ,
      },
      {
        isSubMenu: true,
        path: "/setup/user-groups",
        name: "User Groups",
        icon: "fas fa-users txt-yellow", //ni ni-single-02
        component: UserGroups,
        layout: "/u",
        module: portalModules.USER_GROUP,
        permission: permissions.READ,
      },
      {
        isSubMenu: true,
        path: "/setup/approval-templates",
        name: "Approvals",
        icon: "fas fa-id-card txt-green", // ml-4 mt--3
        component: ApprovalTemplates,
        layout: "/u",
        module: portalModules.APPROVAL,
        permission: permissions.READ,
      },
      {
        isSubMenu: true,
        path: "/setup/store",
        name: "Stores",
        icon: "fa fa-building txt-info", //blue, pink ni ni-planet
        component: Stores,
        layout: "/u",
        module: portalModules.STORE_SETUP,
        permission: permissions.READ,
      },
      {
        isSubMenu: true,
        path: "/setup/user-sessions",
        name: "Users Session",
        icon: "fas fa-users txt-primary", //ni ni-single-02
        component: UsersSession,
        layout: "/u",
        module: portalModules.USER,
        permission: permissions.CREATE,
      },
    ],
  },
  /* {
    name: "Store Setup",
    icon: "fa fa-cogs txt-success",
    children:[
      {
        isSubMenu: true,
        path: "/setup/store",
        name: "Stores",
        icon: "fa fa-building txt-info",//blue, pink ni ni-planet
        component: Stores,
        layout: "/u",
        module: portalModules.STORE_SETUP,
        permission: permissions.READ
      }
    ]
  }, */
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "fa fa-desktop txt-info", //ni ni-tv-2
    component: Dashboard,
    layout: "/u",
  },
  {
    name: "POS",
    icon: "fa fa-building txt-danger",
    children: [
      {
        isSubMenu: true,
        path: "/invoice/create",
        name: "Invoice",
        icon: "fa fa-shopping-cart txt-primary", //blue, pink ni ni-planet
        component: CreateInvoice,
        layout: "/pos",
        module: portalModules.INVOICE,
        permission: permissions.CREATE,
      },
      {
        isSubMenu: true,
        path: "/invoice/view",
        name: "View Invoices",
        // icon: "fa fa-file-invoice-dollar txt-primary",
        component: ViewInvoice,
        layout: "/pos",
        module: portalModules.INVOICE,
        permission: permissions.READ,
      },
      {
        isSubMenu: true,
        path: "/returns/create",
        name: "Returns",
        icon: "fas fa-paper-plane txt-orange", //ni ni-single-02
        component: CreateReturns,
        layout: "/pos",
        module: portalModules.CREDIT_MEMO,
        permission: permissions.READ,
      },
      {
        isSubMenu: true,
        path: "/returns/view",
        name: "View Returns",
        // icon: "fas fa-file-invoice txt-primary",
        component: ViewReturns,
        layout: "/pos",
        module: portalModules.CREDIT_MEMO,
        permission: permissions.READ,
      },
      {
        isSubMenu: true,
        path: "/quotation/create",
        name: "Quotation",
        // icon: "fa fa-shopping-cart txt-primary",
        icon: "fa fa-cart-plus",
        component: CreateSalesQuotation,
        layout: "/pos",
        module: portalModules.SALES_QUOTATION,
        permission: permissions.CREATE,
      },
      {
        isSubMenu: true,
        path: "/quotation/view",
        name: "View Quotation",
        // icon: "fa fa-file-invoice-dollar txt-primary",
        component: ViewSalesQuotation,
        layout: "/pos",
        module: portalModules.SALES_QUOTATION,
        permission: permissions.READ,
      },
    ],
  },
  // Commented this temporarily
  // {
  //   name: "Item",
  //   icon: "fa fa-shopping-cart txt-yellow",
  //   children:[
  //     {
  //       isSubMenu: true,
  //       path: "/print-qrcode",
  //       name: "Print QR Code",
  //       icon: "fas fa-qrcode txt-primary", //tv-2
  //       component: PrintQRCode,
  //       layout: "/u",
  //       module: portalModules.STOCK_TRANSFER_REQUEST,
  //       permission: permissions.CREATE
  //     }
  //   ]
  // },
  {
    name: "Inventory",
    icon: "fa fa-database txt-green", //ni ni-planet
    children: [
      {
        isSubMenu: true,
        path: "/stock-trans-request",
        name: "Transfer Request",
        icon: "fas fa-paper-plane txt-yellow",
        component: StockTransferRequest,
        layout: "/u",
        module: portalModules.STOCK_TRANSFER_REQUEST,
        permission: permissions.CREATE,
      },
      /* {
        isSubMenu: true,
        path: "/inventory-count",
        name: "Counting",
        icon: "fa fa-shopping-cart txt-red", //fa-flip-horizontal, -vertical, fa-rotate-90, -180 -270
        component: InventoryCounting,
        layout: "/u",
        module: portalModules.INVENTORY_COUNTING,
        permission: permissions.CREATE
      } */
    ],
  },
  /* {
    name: "Delivery",
    icon: "fas fa-truck txt-primary", //"ni ni-delivery-fast txt-primary", fighter-jet
    children:[
      {
        isSubMenu: true,
        path: "/delivery/create",
        name: "Create",
        icon: "fas fa-cog txt-info", //tv-2
        component: CreateDelivery,
        layout: "/u",
        module: portalModules.INVOICE,
        permission: permissions.CREATE
      },
      {
        isSubMenu: true,
        path: "/delivery/view",
        name: "View",
        icon: "fas fa-list-ul txt-red", //tv-2 ni ni-align-left-2
        component: ViewDelivery,
        layout: "/u",
        module: portalModules.INVOICE,
        permission: permissions.CREATE
      },
      // {
      //   isSubMenu: true,
      //   path: "/delivery/lgn",
      //   name: "LGn Delivery",
      //   icon: "fas fa-cog txt-green", //tv-2 ni ni-align-left-2
      //   component: LGDelivery,
      //   layout: "/u",
      //   module: portalModules.DELIVERY,
      //   permission: permissions.CREATE
      // }
    ]
  }, */
  //removed icon & name props. to remove it from side menu
  {
    path: "/user-profile",
    component: UserProfile,
    layout: "/u",
  },
  /*{
    path: "/report",
    name: "Reports",
    // icon: "fa fa-file-pdf txt-red",
    // icon: "fas fa-file-excel txt-success",
    icon: "fas fa-newspaper txt-info",
    component: Report,
    layout: "/u",
    module: portalModules.APPROVAL_STATUS_REPORT,
    permission: permissions.READ
  },*/
  /*{
    path: "/tables",
    name: "Reports",
    icon: "ni ni-bullet-list-67 txt-red",
    component: Tables,
    layout: "/u"
  },*/
  {
    path: "/logout",
    name: "Logout",
    icon: "ni ni-button-power txt-red",
    component: Logout,
    layout: "/g",
  },

  // Test - Demo
  /*{
    path: "/incoming-donation",
    name: "Demo",
    // icon: "ni ni-button-power txt-red", //Removed icon to hide this item from Sidemenu
    component: IncomingPayment,
    layout: "/demo"
  },*/
  {
    path: "/pine",
    name: "Pine",
    // icon: "ni ni-button-power txt-red", //Removed icon to hide this item from Sidemenu
    component: Pine,
    layout: "/demo",
  },
];
export default routes;
