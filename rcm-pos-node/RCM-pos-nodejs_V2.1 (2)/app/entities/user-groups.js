const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "UserGroups",
  tableName: "UserGroups",
  columns: {
    userGroupId: {
      name: "UserGroupId",
      primary: true,
      type: "int",
      generated: true,
    },
    //FK Field - OUSR."INTERNAL_K"
    userId: {
      name: "UserId",
      type: "int",
    },
    //FK Field - PORTALUSERGROUPS table, U_GroupId
    groupId: {
      name: "GroupId",
      type: "int",
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
  },
  //NOT Required for Neo
  // relations: {
  //   portalGroups: {
  //     type: "many-to-one",
  //     target: "PortalGroups",
  //     // onDelete: 'CASCADE',
  //     joinColumn: {
  //       name: "GroupId",
  //     },
  //     inverseSide: "userGroups" // Note that this is the relation name in '....js', no the entity name
  //   }
  // }
});
