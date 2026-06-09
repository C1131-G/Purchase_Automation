const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "CashDenominations",
  tableName: "CashDenominations",
  columns: {
    cashDenominationId: {
      name: "CashDenominationId",
      primary: true,
      type: "int",
      generated: true,
    },
    //FK to Store Table
    storeId: {
      name: "StoreId",
      type: "int",
      nullable: true,
    },
    //FK to Counter Table
    storeCounterId: {
      name: "StoreCounterId",
      type: "int",
      nullable: true,
    },
    trxNumber: {
      name: "TrxNumber",
      type: "int",
      unique: true,
      nullable: true,
    },
    trxType: {
      name: "TrxType",
      type: "nvarchar",
      length: 100,
      unique: false,
      nullable: false,
    },
    dateTime: {
      name: "DateTime",
      type: "timestamp",
      nullable: true,
    },
    _5cCoin: {
      name: "5cCoin",
      type: "int",
      default: 0,
    },
    _10cCoin: {
      name: "10cCoin",
      type: "int",
      default: 0,
    },
    _20cCoin: {
      name: "20cCoin",
      type: "int",
      default: 0,
    },
    _50cCoin: {
      name: "50cCoin",
      type: "int",
      default: 0,
    },
    _1$Coin: {
      name: "1DollarCoin",
      type: "int",
      default: 0,
    },
    _2$Coin: {
      name: "2DollarCoin",
      type: "int",
      default: 0,
    },
    _5$Note: {
      name: "5DollarNote",
      type: "int",
      default: 0,
    },
    _10$Note: {
      name: "10DollarNote",
      type: "int",
      default: 0,
    },
    _20$Note: {
      name: "20DollarNote",
      type: "int",
      default: 0,
    },
    _50$Note: {
      name: "50DollarNote",
      type: "int",
      default: 0,
    },
    _100$Note: {
      name: "100DollarNote",
      type: "int",
      default: 0,
    },
  },
  relations: {
    stores: {
      type: "many-to-one",
      target: "Stores",
      // onDelete: "CASCADE",  //ON DELETE CASCADE
      joinColumn: {
        name: "StoreId",
      },
      inverseSide: "cashDenominations",
    },
    storeCounters: {
      type: "many-to-one",
      target: "StoreCounters",
      joinColumn: {
        name: "StoreCounterId",
      },
      inverseSide: "cashDenominations",
    },
  },
});
