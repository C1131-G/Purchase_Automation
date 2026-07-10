const https = require("https");
const fs = require("fs");

const agent = new https.Agent({ rejectUnauthorized: false });

const req = https.request(
  {
    hostname: "172.18.30.114",
    port: 50000,
    path: "/b1s/v1/Login",
    method: "POST",
    agent,
    headers: { "Content-Type": "application/json" },
  },
  (res) => {
    let data = "";
    res.on("data", (d) => (data += d));
    res.on("end", () => {
      const login = JSON.parse(data);
      const sid = login.SessionId;
      console.log("Logged in:", sid);

      const req2 = https.request(
        {
          hostname: "172.18.30.114",
          port: 50000,
          path: "/b1s/v1/$metadata",
          method: "GET",
          agent,
          headers: { Cookie: "B1SESSION=" + sid },
        },
        (res2) => {
          let metadata = "";
          res2.on("data", (d) => (metadata += d));
          res2.on("end", () => {
            fs.writeFileSync("metadata.xml", metadata);
            console.log("Metadata saved. Extracting Document fields...");
            const lines = metadata.split("\n");
            let inDoc = false;
            let inDocLine = false;
            for (const line of lines) {
              if (line.includes('<EntityType Name="Document"')) inDoc = true;
              else if (line.includes('</EntityType>')) inDoc = false;
              if (inDoc && line.toLowerCase().includes("reason")) console.log("Doc:", line.trim());

              if (line.includes('<ComplexType Name="DocumentLine"')) inDocLine = true;
              else if (line.includes('</ComplexType>')) inDocLine = false;
              if (inDocLine && line.toLowerCase().includes("reason")) console.log("DocLine:", line.trim());
            }
          });
        }
      );
      req2.end();
    });
  }
);

req.write(JSON.stringify({ CompanyDB: "AJAX_POS_DB", UserName: "manager", Password: "123" }));
req.end();
