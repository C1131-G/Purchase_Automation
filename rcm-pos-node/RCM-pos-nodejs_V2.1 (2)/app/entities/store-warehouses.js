const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "StoreWarehouses",
  tableName: "StoreWarehouses",
  columns: {
    storeWarehouseId: {
      name: "StoreWarehouseId",
      primary: true,
      type: "int",
      generated: true,
    },
    warehouseCode: {
      name: "WarehouseCode",
      type: "nvarchar",
      length: 100,
      unique: false,
    },
    warehouseName: {
      name: "WarehouseName",
      type: "nvarchar",
      length: 400,
      unique: false,
      nullable: false,
    },
    createdBy: {
      name: "CreatedBy",
      type: "int",
      nullable: false,
    },
    createdAt: {
      name: "CreatedAt",
      type: "timestamp",
      // default: process.env.TYPEORM_TYPE === "postgres" ? "now()" : ""
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
      inverseSide: "storeWarehouses", // Note that this is the relation name in '<parent-entity>.js', no the entity name
    },
  },
});
