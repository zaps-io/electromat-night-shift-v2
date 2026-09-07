import { createServer } from "node:http";
import { writeFileSync } from "node:fs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    if (!body) {
      res.writeHead(200, { ...cors, "Content-Type": "text/plain" });
      res.end("ready");
      return;
    }
    try {
      const { path, data } = JSON.parse(body);
      writeFileSync(path, Buffer.from(String(data).split(",")[1] ?? "", "base64"));
      res.writeHead(200, { ...cors, "Content-Type": "text/plain" });
      res.end("ok");
    } catch (err) {
      res.writeHead(400, { ...cors, "Content-Type": "text/plain" });
      res.end(String(err));
    }
  });
}).listen(8765, "127.0.0.1");
