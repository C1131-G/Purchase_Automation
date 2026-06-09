const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Stores",
  tableName: "Stores",
  columns: {
    storeId: {
      name: "StoreId", //Col. name
      primary: true,
      type: "int",
      generated: true,
    },
    storeName: {
      name: "StoreName",
      type: "nvarchar",
      length: 200,
      unique: true,
      nullable: false, //by default this is false
    },
    storeCode: {
      name: "StoreCode",
      type: "nvarchar",
      length: 100,
      unique: true,
      nullable: true,
    },
    location: {
      name: "Location",
      type: "nvarchar",
      length: 400,
      unique: false,
      nullable: false, //by default this is false
    },
    locationCode: {
      name: "LocationCode",
      type: "nvarchar",
      length: 100,
      unique: false,
      nullable: true,
    },
    defaultWarehouseCode: {
      name: "DefaultWarehouseCode",
      type: "nvarchar",
      length: 100,
      unique: false,
      nullable: true,
    },
    description: {
      name: "Description",
      type: "nvarchar",
      length: 300,
      unique: false,
      nullable: true,
    },
    createdBy: {
      name: "CreatedBy",
      type: "int",
    },
    createdAt: {
      name: "CreatedAt",
      type: "timestamp",
      // default: process.env.TYPEORM_TYPE === "postgres" ? "now()" : () => "CURRENT_TIMESTAMP"
      nullable: true,
    },
    modifiedBy: {
      name: "ModifiedBy",
      type: "int",
      nullable: true,
    },
    modifiedAt: {
      name: "ModifiedAt",
      type: "timestamp",
      // type: "varchar",
      // length: 100,
      nullable: true,
    },
  },
  relations: {
    storeWarehouses: {
      //this prop name is used as 'inverseSide' in the <child-entity>.js
      type: "one-to-many",
      target: "StoreWarehouses",
      // cascade: true,
      inverseSide: "stores", // Note that this is relation name added in '<child entity>.js', not the entity name
    },
    storeCounters: {
      type: "one-to-many",
      target: "StoreCounters",
      inverseSide: "stores",
    },
    storeUsers: {
      type: "one-to-many",
      target: "StoreUsers",
      inverseSide: "stores",
    },
    // userSessionLog: {
    //   type: "one-to-many",
    //   target: "UserSessionLog",
    //   inverseSide: "stores"
    // },
    cashDenominations: {
      type: "one-to-many",
      target: "CashDenominations",
      inverseSide: "stores",
    },
  },
});
