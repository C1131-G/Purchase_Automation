const axios = require("axios");
const https = require("https");
require("dotenv").config();

async function test() {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const loginRes = await axios.post(
      process.env.SERVICE_LAYER_URL + "/Login",
      {
        CompanyDB: "C1131-G",
        UserName: "manager",
        Password: "Password@123",
      },
      { httpsAgent: agent },
    );

    const cookies = loginRes.headers["set-cookie"];
    const cookieStr = cookies.map((c) => c.split(";")[0]).join("; ");

    const res = await axios.get(
      process.env.SERVICE_LAYER_URL + "/PriceLists?$select=PriceListNo,PriceListName",
      {
        headers: { Cookie: cookieStr },
        httpsAgent: agent,
      },
    );

    console.log("Success! PriceLists:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error("Error:");
    if (e.response) {
      console.error(e.response.status, e.response.data);
    } else {
      console.error(e.message);
    }
  }
}
test();
