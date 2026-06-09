const { recordState } = require("../config/config");
const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "UserSessionLog",
  tableName: "UserSessionLog",
  columns: {
    userSessionLogId: {
      name: "UserSessionLogId",
      primary: true,
      type: "int",
      generated: true,
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
      nullable: true,
    },
    //FK to Counter Table
    storeCounterId: {
      name: "StoreCounterId",
      type: "int",
      nullable: true,
    },
    counterCode: {
      name: "CounterCode",
      type: "nvarchar",
      length: 100,
      nullable: true,
    },
    counterName: {
      name: "CounterName",
      type: "nvarchar",
      length: 100,
      nullable: true,
    },
    clientIp: {
      name: "ClientIp",
      type: "varchar",
      length: "100",
    },
    sessionStatus: {
      name: "SessionStatus", //"ACTIVE" or "INACTIVE"
      type: "nvarchar",
      length: 50,
      default: recordState.ACTIVE,
      unique: false,
      nullable: false,
    },
    loginTime: {
      name: "LoginTime",
      type: "timestamp",
      //WORKING!
      // default: () => "CURRENT_TIMESTAMP", //"CURRENT_TIMESTAMP" didn't work using an anonymous funct. did the job
      // default: process.env.TYPEORM_TYPE === "postgres" ? "now()" : ""
    },
    logoutTime: {
      name: "LogoutTime",
      type: "timestamp",
      /** NOTE: Setting this a `null` threw error during CREATE op.
       * Since this is a `timestamp` field, this is mandatory during CREATE op., if this wasnt included in the 
       * payload or if `null` value is set for this field, below err. is thrown,
            `cannot insert NULL or update to NULL: Not nullable "LogoutTime" column`.

         Setting blank value as default fixed it.
       */

      default: "",
      nullable: true,
      // default: process.env.TYPEORM_TYPE === "postgres" ? "now()" : ""
    },
  },
  // relations: {
  //   stores: {
  //     type: "many-to-one",
  //     target: "Stores",
  //     // onDelete: "CASCADE",  //ON DELETE CASCADE
  //     joinColumn: {
  //       name: "StoreId",
  //     },
  //     inverseSide: "userSessionLog"
  //   },
  //   storeCounters: {
  //     type: "many-to-one",
  //     target: "StoreCounters",
  //     joinColumn: {
  //       name: "StoreCounterId",
  //     },
  //     inverseSide: "userSessionLog"
  //   }
  // }
});
