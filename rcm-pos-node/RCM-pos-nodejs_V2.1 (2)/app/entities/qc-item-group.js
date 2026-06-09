/**
 * SAMPLE - NOT Required for POS
 */

const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "QCItemGroup",
  tableName: "QCItemGroup",
  columns: {
    itemGroupId: {
      name: "ItemGroupId", //Col. name
      primary: true,
      type: "int",
      generated: true,
    },
    groupName: {
      name: "GroupName",
      type: "varchar",
      length: 100,
      unique: true,
      nullable: false, //by default this is false
    },
    description: {
      name: "Description",
      type: "varchar",
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
      // type: "timestamp", //Need to capture time during QC operation too. So changing it to 'varchar' as a 'hack' as no other option worked
      type: "varchar",
      length: 100,
      // default: process.env.TYPEORM_TYPE === "postgres" ? "now()" : "" //unable to set default value in Hana
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
  },
  relations: {
    itemGroupMembers: {
      //this prop name is used as 'inverseSide' in qc-item-group-members.js
      type: "one-to-many",
      target: "QCItemGroupMembers",
      // cascade: true,  //If set to true, the related object will be inserted and updated in the database
      inverseSide: "itemGroup", // Note that this is relation name added in 'qc-criteria-values.js', not the entity name
    },
  },
});
