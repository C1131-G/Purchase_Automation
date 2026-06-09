//Company Name
const companyName = "R.C.MANUBHAI & CO. PTE.LTD.";
const companyTitle = "";
const companyURL = "https://rcmanubhai.com.fj";

export const companyNames = {
  // AJAX: "Ajax",
  RCM: "RCM",
  // BMP: "Ba Motor Parts",
};

export const companyInfo = {
  NAME: "R.C.MANUBHAI & CO. PTE.LTD.",
  ADDRESS: "Market Subdivision Ba Ba",
  STORE: "R.C.MANUBHAI & CO. PTE.LTD.",
  PHONE: "(679) 667 4633",
  WEBSITE: "www.rcmanubhai.com.fj",
  EMAIL: "info@rcmanubhai.com.fj",
};

// export const companyInfo = {
//   NAME: "Ajax Spurway Fasteners Pte Ltd.",
//   ADDRESS: "Market Subdivision, BA",
//   STORE: "Ajax Spurway Fasteners Pte Ltd.",
//   PHONE: "(679) 331 5122",
//   WEBSITE: "https://bamotorparts.com",
//   EMAIL: "info@ajaxfasteners.com.fj",
// };

export const companyInfo2 = {
  NAME: "R. C. MANUBHAI & Co. PTE LTD",
  ADDRESS: "P. O. BOX 9, Shop No.6, Market Subdivision, BA",
  STORE: "R. C. MANUBHAI & Co. PTE LTD",
  PHONE: "(679) 667 4633",
  WEBSITE: "www.rcmanubhai.com.fj",
  EMAIL: "info@rcmanubhai.com.fj",
};

// export const companyInfo2 = {
//   NAME: "Ba Motor Parts PTE Limited",
//   ADDRESS: "BA",
//   STORE: "BA-Ba Town Shop",
//   PHONE: "(679) 667 4633",
//   WEBSITE: "www.rcmanubhai.com.fj",
//   EMAIL: "info@rcmanubhai.com.fj",
// };

export const countryCode = "FJ";
export const rcmCompanyTIN = "50-05534-0-0";
export const ajaxCompanyTIN = "50-13431-0-9";
export const companyTIN = rcmCompanyTIN; // Alias for compatibility with InvoiceReceiptModel.js from source
//Local Currency
const systemCurrency = "FJD";
export const currencySymbols = {
  [systemCurrency]: "FJD",
};

export const TAX_PROPS = {
  TaxLocal: "TaxLocal",
  TaxForeign: "TaxForeign",
};

export const PAYMENT_METHODS = {
  Cash: "Cash",
  Card: "Card",
  Credit: "Credit",
  Check: "Cheque",
};

// DO NOT Change this
export const CASH_BANK_ACCOUNT_CODE = "CASH";

export const DEFAULT_TAX_CODE = "OUT-12.5";
export const DEFAULT_TAX_PERCENT = 12.5;

export const PRECISION = 5;
export const TOTAL_AMT_PRECISION = 2;
export const DEFAULT_BRANCH_ID = 1;

const isMultiBranchEnabled = false;
const isModuleApprovalsEnabled = false;
const isSharedParkTransactionEnabled = true;
const isHomeDeliveryEnabled = true;
const isBranchEnabled = true;
const isGrossPriceEnabled = true;

const requestComment = "Created via POS. ";

//This will enable users to 'print' QR Codes for Batch/Serial recs. that belongs to Drafts which are
//NOT Approved yet, i.e. to print QR Codes before GRPOs are created
const enablePrintQRCodeForDrafts = true;

const enableSalesQuotationParkResumeWidget = false; //Default value is false

export const customerTypes = {
  B2B: "B2B",
  B2C: "B2C",
};

export const creditCardTypes = ["ANZ", "BSP", "WESTPAC", "Others"];

export const cardImageMap = {
  VISA: "Visa",
  Master: "Master",
  Amex: "Amex",
  DR: "Debit",
  MPaisa: "Mpaisa",
  Card: "Card",
  MyCash: "MyCash",
  VisionPay: "VisionPay",
  // Add more mappings as needed
};

export const timYardItemGroups = ["TMBR", "TIMBER"];

//Module names must match the "Module Name" column from PORTALMODULES Table
const portalModules = {
  USER: "User",
  USER_GROUP: "User Group",
  APPROVAL: "Approval",
  INVOICE: "Invoice",
  CUSTOMER: "Customer",
  CREDIT_MEMO: "Credit Memo",
  CREDIT_MEMO_REQUEST: "Credit Memo",
  STORE_SETUP: "Store Setup",
  STORE_WAREHOUSE: "Store Warehouse",
  STORE_COUNTER: "Store Counter",
  STORE_USER: "Store User",
  SALES_QUOTATION: "Sales Quotation",
  STOCK_TRANSFER_REQUEST: "Stock Transfer Request",

  INVENTORY_COUNTING: "Inventory Counting",
  APPROVAL_STATUS_REPORT: "Approval Status Report",
  SALES_ORDER: "Sales Order",
  DELIVERY: "Delivery",
  PAYMENT: "Payment",
};

const appPaths = {
  HOME: "/u/dashboard",
  CREATE_INVOICE: "/pos/invoice/create",
  VIEW_INVOICE: "/pos/invoice/view",
  CREATE_RETURNS: "/pos/returns/create",
  VIEW_RETURNS: "/pos/returns/view",
  CREATE_QUOTATION: "/pos/quotation/create",
  VIEW_QUOTATION: "/pos/quotation/view",
};

const objectCodes = {
  [portalModules.SALES_ORDER]: 17,
  [portalModules.SALES_QUOTATION]: 23,
};

//these modules will be removed from teh Modules dropdown in Reports & Approval Setup screens
const nonSAPModules = [
  portalModules.USER,
  portalModules.USER_GROUP,
  portalModules.APPROVAL,
  portalModules.APPROVAL_STATUS_REPORT,
  portalModules.SALES_ORDER,
  portalModules.STORE_SETUP,
  portalModules.STORE_WAREHOUSE,
  portalModules.STORE_COUNTER,
  portalModules.STORE_USER,
];

const apiURIs = {
  [portalModules.STOCK_TRANSFER_REQUEST]: "stock-transfer-request",
  [portalModules.SALES_QUOTATION]: "sales-quotation",
  [portalModules.INVOICE]: "invoice",
  // [portalModules.CREDIT_MEMO]: "credit-memo",
  [portalModules.CREDIT_MEMO_REQUEST]: "credit-memo-request",
  [portalModules.CUSTOMER]: "customer",
};

//below values must match the column names in PORTALPERMISSIONS table
const permissions = {
  READ: "U_AllowRead",
  WRITE: "U_AllowWrite",
  CREATE: "U_AllowCreate",
  CANCEL: "U_AllowCancel",
};

const displayModes = {
  VIEW: "VIEW",
  EDIT: "EDIT",
  CREATE: "CREATE",
  COPY: "COPY",
  RESUBMIT: "RESUBMIT",
  NORMAL: "NORMAL",
  DISABLED: "DISABLED",
};

const userRoles = {
  ORIGINATOR: "ORIGINATOR",
  APPROVER: "APPROVER",
  TEMPLATE: "TEMPLATE",
  ADMIN: "ADMIN",
};

//The 'value' MUST match the User Gruop defined in the UI
const neoUserGroups = {
  STORE_MANAGER: "Store Manager",
  SALES_EXECUTIVE: "Sales Executive",
};

const userGroups = {
  DELIVERY_AGENT: "Delivery Agent",
};

const draftStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  GENERATED: "GENERATED", //In a NON Multi-level approval setup, when the No. of the Approvals
  //required for a draft is received, the statuses of the Approval records
  //created for rest of the Approvers that are in PENDING status will be changed
  //to GENERATED

  REJECTED: "REJECTED",
  NOT_REQUIRED: "NOT_REQUIRED", //when one Approver 'rejects' the request, the statuses of the Approval
  // recs. created for other Approver's will be set as NOT_REQUIRED

  NOT_ASSIGNED: "NOT_ASSIGNED", //for a Draft with Multi-level approval setup, initially, only the Level #1
  //will be set as PENDING, while the reset will be set with NOT_ASSIGNED status
  //once the 1st is Approved, the 2nd will become PENDING and so on...
  AUTO_APPROVED: "AUTO_APPROVED", //for Stock Transfer Reqs. that are created by Approver themselves
  QC_PENDING: "QC PENDING", //Set to GRPO/RFP Drafts on creation when they contain Items that require QC
};

const dateFormat = "YYYY-MM-DD";
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

//Default password for New users
const defaultPassword = "newuser@ltl";
const saltRounds = 10;

//Pages list
//const portalModules = ["GRPO", "Users", "User Roles"];
const recordState = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
};

export const recordStatusList = [
  { name: "ALL", code: "" },
  { name: recordState.OPEN, code: "O" },
  { name: recordState.CLOSED, code: "C" },
];

const recordTypes = {
  DIRECT: "direct",
  DRAFT: "draft",
};

const itemTypes = {
  BATCHES: "Batches",
  SERIAL_NUMBERS: "Serial Numbers",
  NORMAL: "Normal",
  LABOR: "Labor",
};

/**
 * Property Names for sending to Service Layer API
 */
const itemTypeProperties = {
  BATCH_NUMBER: "BatchNumber",
  BATCH_NUMBER_OLD: "BatchNumberProperty",
  SERIAL_NUMBER: "InternalSerialNumber",
};

/**
 * Array Names within which BAtch/Serial recs. are available
 */
const itemTypeArrays = {
  BATCH_NUMBERS: "BatchNumbers",
  SERIAL_NUMBERS: "SerialNumbers",
  INVENTORY_COUNTING_BATCH_NUMBERS: "InventoryCountingBatchNumbers",
  INVENTORY_COUNTING_SERIAL_NUMBERS: "InventoryCountingSerialNumbers",
};

const itemRequestType = {
  ITEM_WITHOUT_QRCODE: "ITEM_WITHOUT_QRCODE",
  BATCH_SERIAL_WITH_ALL_BINS: "BATCH_SERIAL_WITH_ALL_BINS",
  BATCH_SERIAL_IN_A_BIN: "BATCH_SERIAL_IN_A_BIN",
};

const operations = {
  CLOSE: "CLOSE",
  SAVE: "SAVE",
  SAVE_AND_CLOSE: "SAVE_AND_CLOSE",
};

//constants
const constants = {
  NOT_RESERVED: "NOT_RESERVED",
};

const dataTypes = {
  INTEGER: "INTEGER",
  FLOAT: "FLOAT",
  STRING: "STRING",
  DATE: "DATE",
};

const statusColors = {
  SUCCESS: "success",
  INFO: "info",
  PRIMARY: "primary",
  WARNING: "warning",
  DANGER: "danger",
};

const recordStatuses = {
  IS_UPDATED: "isUpdated",
  IS_DELETED: "isDeleted",
  IS_CHECKED: "isChecked",
};

const SQUARE_ROOT = "√";
const arithmeticOperators = ["+", "-", "*", "/", "(", ")", SQUARE_ROOT];
const relationalOperators = ["<", "<=", ">", ">=", "==", "!="];
const logicalOperators = ["and", "or"];
const logicalOperatorNames = {
  and: "and",
  or: "or",
};

const httpStatusCodes = {
  // Success responses
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client error responses
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401, //Invalid Session
  FORBIDDEN: 403, //Doesn't have Required Permission
  NOT_FOUND: 404,

  // Server error responses
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

export {
  companyName,
  companyTitle,
  companyURL,
  portalModules,
  objectCodes,
  apiURIs,
  permissions,
  displayModes,
  userRoles,
  neoUserGroups,
  userGroups,
  draftStatus,
  dateFormat,
  months,
  defaultPassword,
  saltRounds,
  systemCurrency,
  isMultiBranchEnabled,
  isModuleApprovalsEnabled,
  requestComment,
  nonSAPModules,
  recordState,
  recordTypes,
  itemTypes,
  itemTypeProperties,
  itemTypeArrays,
  itemRequestType,
  enablePrintQRCodeForDrafts,
  operations,
  constants,
  dataTypes,
  statusColors,
  SQUARE_ROOT,
  arithmeticOperators,
  relationalOperators,
  logicalOperators,
  logicalOperatorNames,
  httpStatusCodes,
  appPaths,
  recordStatuses,
  isHomeDeliveryEnabled,
  isSharedParkTransactionEnabled,
  enableSalesQuotationParkResumeWidget,
  isGrossPriceEnabled,
  isBranchEnabled,
};
