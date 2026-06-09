const typeorm = require("typeorm");
const path = require("path");

const dataSource = new typeorm.DataSource({
  type: process.env.TYPEORM_TYPE,
  host: process.env.HANA_HOST,
  port: process.env.HANA_PORT,
  username: process.env.HANA_USER,
  password: process.env.HANA_PASSWORD,
  schema: process.env.SERVICE_LAYER_COMPANYDB,
  synchronize: true, //setting it `true` will update the Table structure in the db when app restarts
  logging: ["query"], //"error",
  entities: [path.join(__dirname, "../entities/*.js")],
});

console.log("Before typeORM initializes...");
dataSource
  .initialize()
  .then(() => {
    console.info("Database has been initialized by TypeORM!");
  })
  .catch((error) => {
    console.error("Failed to initialize db using TypeORM!");
    console.log(error);
  });

module.exports = { dataSource };
