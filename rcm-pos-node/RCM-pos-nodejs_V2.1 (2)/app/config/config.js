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
const saltRounds = 10;

const fircaIntegrationWaitTime = 10 * 1000; //10 secs. // Set `0` to DISABLE the wait
const enableFircaIntegration = false; // set enable or disable FIRCA Integration

const enableStoreBasedNumbering = true; // set enable or disable store based numbering sequencce.

const isHomeDeliveryEnabled = true; //set enable or disable COD to Home Delivery.

//Local Currency
const systemCurrency = "FJD";
const defaultBranchId = 1;
const attachmentPath = "\\\\172.18.20.16\\rcmsapshared\\";

/**
 * When enabled, instead of using different Account Codes for each Card (during Card based purchase),
 * the app will use one single Account Code for all the Cards based on the Location (Store) from where
 * the Invoice is created.
 */
const enableLocationBasedCreditCardAccount = true;

//Module names must match the "Module Name" column from PORTALMODULES Table
const portalModules = {
  USER: "User",
  USER_GROUP: "User Group",
  APPROVAL: "Approval",
  INVOICE: "Invoice",
  INCOMING_PAYMENT: "Incoming Payment",
  JOURNAL_ENTRY: "Journal Entry",
  CREDIT_MEMO: "Credit Memo",
  CREDIT_MEMO_REQUEST: "Credit Memo",
  STORE_SETUP: "Store Setup",
  STORE_WAREHOUSE: "Store Warehouse",
  STORE_COUNTER: "Store Counter",
  STORE_USER: "Store User",
  SALES_QUOTATION: "Sales Quotation",

  BUSINESS_PARTNER: "Business Partners",
  INVOICE: "Invoice",
  STOCK_TRANSFER_REQUEST: "Stock Transfer Request",

  STOCK_TRANSFER: "Stock Transfer",
  INVENTORY_COUNTING: "Inventory Counting",
  APPROVAL_STATUS_REPORT: "Approval Status Report",
  SALES_ORDER: "Sales Order",
  DELIVERY: "Delivery",
  ITEM: "Item",
  OSBS: "OSBS",
  ATTACHMENTS: "Attachments2",
};

const objectCodes = {
  [portalModules.INVOICE]: 13,
  [portalModules.CREDIT_MEMO_REQUEST]: 234000031,
  [portalModules.INCOMING_PAYMENT]: 24,
  [portalModules.SALES_ORDER]: 17,
  [portalModules.SALES_QUOTATION]: 23,
  [portalModules.STOCK_TRANSFER_REQUEST]: 1250000001,
};

const serviceLayerApiURIs = {
  [portalModules.BUSINESS_PARTNER]: "BusinessPartners",
  [portalModules.INVOICE]: "Invoices",
  [portalModules.INCOMING_PAYMENT]: "IncomingPayments",
  [portalModules.JOURNAL_ENTRY]: "JournalEntries",
  [portalModules.SALES_QUOTATION]: "Quotations",
  [portalModules.INVENTORY_COUNTING]: "InventoryCountings",
  // [portalModules.CREDIT_MEMO]: "CreditNotes",
  [portalModules.CREDIT_MEMO_REQUEST]: "ReturnRequest", //Using `Credit Memo Request` instead of `Credit Memo`
  // [portalModules.STOCK_TRANSFER_REQUEST]: "stock-transfer-request",
  // [portalModules.STOCK_TRANSFER]: "stock-transfer",
  [portalModules.DELIVERY]: "DeliveryNotes",
  [portalModules.ITEM]: "Items",
};

const draftObjectCodes = {
  STOCK_TRANSFER_REQUEST: 1250000001,
  STOCK_TRANSFER: 67,
  [portalModules.DELIVERY]: 15,
};

const trxTypes = {
  INCOMING_PAYMENT: "INCOMING_PAYMENT",
  OUTGOING_PAYMENT: "OUTGOING_PAYMENT",
  COUNTER_TO_COUNTER: "COUNTER_TO_COUNTER",
  OPENING_BALANCE: "OPENING_BALANCE",
  CLOSING_BALANCE: "CLOSING_BALANCE",
};

// Item Groups that should not be displayed in the Item Search
const EXCLUDED_ITEM_GROUPS = []; //130 = 'Ammo Services' Item Group

//below values must match the column names in PORTALPERMISSIONS table
const permissions = {
  READ: "U_AllowRead",
  WRITE: "U_AllowWrite",
  CREATE: "U_AllowCreate",
  CANCEL: "U_AllowCancel",
};

const userRoles = {
  ORIGINATOR: "ORIGINATOR",
  APPROVER: "APPROVER",
  TEMPLATE: "TEMPLATE",
  ADMIN: "ADMIN",
};

const draftStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  GENERATED: "GENERATED", //In a NON Multi-level approval setup, when the No. of the Approvals
  //required for a draft is received, the statuses of the Approval records
  //created for rest of the Approvers that are in PENDING status will be changed
  //to GENERATED

  REJECTED: "REJECTED",
  FAILED: "FAILED",
  NOT_REQUIRED: "NOT_REQUIRED", //when one Approver 'rejects' the request, the statuses of the Approval
  // recs. created for other Approver's will be set as NOT_REQUIRED

  NOT_ASSIGNED: "NOT_ASSIGNED", //for a Draft with Multi-level approval setup, initially, only the Level #1
  //will be set as PENDING, while the reset will be set with NOT_ASSIGNED status
  //once the 1st is Approved, the 2nd will become PENDING and so on...
  AUTO_APPROVED: "AUTO_APPROVED", //for Stock Transfer Reqs. that are created by Approver themselves
};

const recordState = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

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

const requestTypes = {
  ITEM_WITHOUT_QRCODE: "ITEM_WITHOUT_QRCODE",
  BATCH_SERIAL_WITH_ALL_BINS: "BATCH_SERIAL_WITH_ALL_BINS",
  BATCH_SERIAL_IN_A_BIN: "BATCH_SERIAL_IN_A_BIN",
};

const sessionStoreTypes = {
  REDIS: "REDIS",
  FILE: "FILE",
};

const sessionMaxAgeInHours = 17; //in Hours
const sessionStore = sessionStoreTypes.FILE;
const cookieName = "ONE";
const sessionSecret = "kiafn239df#@asdf$%^13423#$%@sdfgdf";

const httpStatusCodes = {
  // Success responses
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client error responses
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,

  // Server error responses
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

module.exports = {
  enableLocationBasedCreditCardAccount,
  dateFormat,
  months,
  saltRounds,
  systemCurrency,
  defaultBranchId,
  portalModules,
  serviceLayerApiURIs,
  trxTypes,
  draftObjectCodes,
  permissions,
  userRoles,
  draftStatus,
  recordState,
  recordTypes,
  itemTypes,
  requestTypes,
  sessionStoreTypes,
  sessionStore,
  cookieName,
  sessionSecret,
  sessionMaxAgeInHours,
  httpStatusCodes,
  fircaIntegrationWaitTime,
  enableFircaIntegration,
  enableStoreBasedNumbering,
  isHomeDeliveryEnabled,
  objectCodes,
  attachmentPath,
  EXCLUDED_ITEM_GROUPS,
};
