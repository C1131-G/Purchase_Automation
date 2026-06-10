import axios from "axios";

async function test() {
  try {
    const form = new FormData();
    form.append("file", new Blob(["test"]), "test.txt");
    await axios.post("http://localhost:1", form);
  } catch (e) {
    console.log("Axios error:", e.message);
  }
}

test();
