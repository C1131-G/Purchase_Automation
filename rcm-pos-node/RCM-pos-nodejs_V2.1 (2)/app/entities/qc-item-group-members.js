/**
 * SAMPLE - NOT Required for POS
 */

const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "QCItemGroupMembers",
  tableName: "QCItemGroupMembers",
  columns: {
    itemGroupMemberId: {
      name: "ItemGroupMemberId",
      primary: true,
      type: "int",
      generated: true,
    },
    itemCode: {
      name: "ItemCode",
      type: "varchar",
      length: 100,
      unique: true,
    },
    itemName: {
      name: "ItemName",
      type: "varchar",
      length: 400,
      unique: false,
      nullable: true,
    },
    createdBy: {
      name: "CreatedBy",
      type: "int",
      nullable: false,
    },
    createdAt: {
      name: "CreatedAt",
      // type: "timestamp",
      // type: "datetime",   //Error: Data type "datetime" in "QCPlanCriteria.createdAt" is not supported by "sap" database
      type: "varchar",
      length: 100,
      // default: "now()"
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
      // type: "timestamp",
      type: "varchar",
      length: 100,
      // default: process.env.TYPEORM_TYPE === "postgres" ? "now()" : ""
      nullable: true,
    },
    //FK Field
    itemGroupId: {
      name: "ItemGroupId",
      type: "int",
    },
  },
  relations: {
    itemGroup: {
      //NOTE: this prop name is used as 'inverseSide' in qc-item-group.js
      type: "many-to-one",
      target: "QCItemGroup",
      onDelete: "CASCADE", //ON DELETE CASCADE, Deletes the child recs. when Parent rec. is deleted
      joinColumn: {
        name: "ItemGroupId", //FK field in the current table
      },
      inverseSide: "itemGroupMembers", // Note that this is the relation name in 'qc-criterai.js', no the entity name
    },
  },
});
