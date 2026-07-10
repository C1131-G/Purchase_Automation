import axios from "axios";

async function testApi() {
  try {
    const res = await axios.get("http://localhost:4000/api/v1/organization/databases");
    console.log("Databases:", res.data);
  } catch (err: any) {
    console.error("Error:");
    if (err.response) {
      console.error(err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}
testApi();
