const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "StoreUsers",
  tableName: "StoreUsers",
  columns: {
    storeUserId: {
      name: "storeUserId",
      primary: true,
      type: "int",
      generated: true,
    },
    userId: {
      name: "UserId",
      type: "int",
      nullable: false,
    },
    userName: {
      name: "UserName",
      type: "nvarchar",
      length: 200,
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
      inverseSide: "storeUsers", // Note that this is the relation name in '<parent-entity>.js', no the entity name
    },
  },
});
