import axios from "axios";

async function testApi() {
  try {
    const loginRes = await axios.post("http://localhost:4000/api/v1/auth/login", {
      username: "manager",
      password: "Password@123",
      companyDB: "C1131-G",
    });

    const cookies = loginRes.headers["set-cookie"];
    if (!cookies) {
      console.log("No cookies received in login:", loginRes.data);
      return;
    }

    const cookieStr = cookies.map((c: string) => c.split(";")[0]).join("; ");

    const res = await axios.get("http://localhost:4000/api/v1/master-data/price-lists", {
      headers: { Cookie: cookieStr },
    });

    console.log("Success! Price Lists:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error("Error from URL:", err.config?.url);
    if (err.response) {
      console.error(err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}
testApi();
