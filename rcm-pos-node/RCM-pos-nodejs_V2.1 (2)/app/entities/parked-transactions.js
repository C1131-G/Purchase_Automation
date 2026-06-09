const { recordState } = require("../config/config");
const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "ParkedTransactions",
  tableName: "ParkedTransactions",
  columns: {
    parkedTransactionId: {
      name: "ParkedTransactionsId",
      primary: true,
      type: "int",
      generated: true,
    },
    // INVOICE or SALES_QUOTATION
    transactionType: {
      name: "TransactionType",
      type: "nvarchar",
      length: 50,
    },
    userId: {
      name: "UserId",
      type: "int",
    },
    userName: {
      name: "UserName",
      type: "nvarchar",
      length: 200,
      unique: false,
      nullable: false,
    },
    //FK to Store Table
    storeId: {
      name: "StoreId",
      type: "int",
      nullable: true,
    },
    storeLocation: {
      name: "StoreLocation",
      type: "nvarchar",
      length: 100,
      nullable: false,
    },
    //FK to Counter Table
    storeCounterId: {
      name: "StoreCounterId",
      type: "int",
      nullable: false,
    },
    counterCode: {
      name: "CounterCode",
      type: "nvarchar",
      length: 100,
      nullable: false,
    },
    // For user reference.
    // Auto-generate it in this format <nextRefNum>-<dd><MMM>
    transactionRefNum: {
      name: "TransactionRefNum",
      type: "nvarchar",
      length: "100",
    },
    // Stores the next no. that must be prepended to the next TrxRefNum
    nextRefNum: {
      name: "NextRefNum",
      type: "int",
      // generated: true // Works only with PK
    },
    data: {
      name: "Data",
      type: "nclob",
      nullable: false,
    },
    parkedDateTime: {
      name: "ParkedDateTime",
      type: "timestamp",
      //WORKING!
      // default: () => "CURRENT_TIMESTAMP", //"CURRENT_TIMESTAMP" didn't work using an anonymous funct. did the job
    },
  },
});
