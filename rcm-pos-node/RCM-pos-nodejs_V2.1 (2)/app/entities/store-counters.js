const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "StoreCounters",
  tableName: "StoreCounters",
  columns: {
    storeCounterId: {
      name: "StoreCounterId",
      primary: true,
      type: "int",
      generated: true,
    },
    counterName: {
      name: "CounterName",
      type: "nvarchar",
      length: 100,
      unique: false, //Counter Name must be unique only within a Store
      nullable: false,
    },
    counterCode: {
      name: "CounterCode",
      type: "nvarchar",
      length: 100,
      unique: true,
      nullable: false,
    },
    userId: {
      name: "UserId",
      type: "int",
      nullable: true,
    },
    description: {
      name: "Description",
      type: "nvarchar",
      length: 300,
      unique: false,
    },
    createdBy: {
      name: "CreatedBy",
      type: "int",
      nullable: false,
    },
    createdAt: {
      name: "CreatedAt",
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
    },
    modifiedBy: {
      name: "ModifiedBy",
      type: "int",
      nullable: true,
    },
    modifiedAt: {
      name: "ModifiedAt",
      type: "timestamp",
      nullable: true,
    },
    //FK Field
    storeId: {
      name: "StoreId",
      type: "int",
    },
  },
  relations: {
    stores: {
      //NOTE: this prop name is used as 'inverseSide' in <parent-entity>.js
      type: "many-to-one",
      target: "Stores",
      // onDelete: 'CASCADE',  //ON DELETE CASCADE, Deletes the child recs. when Parent rec. is deleted
      joinColumn: {
        name: "StoreId", //FK field in the current table
      },
      inverseSide: "storeCounters", // Note that this is the relation name in '<parent-entity>.js', no the entity name
    },
    // userSessionLog: {
    //   type: "one-to-many",
    //   target: "UserSessionLog",
    //   inverseSide: "storeCounters"
    // },
    cashDenominations: {
      type: "one-to-many",
      target: "CashDenominations",
      inverseSide: "storeCounters",
    },
  },
});
