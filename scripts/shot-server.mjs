import { createServer } from "node:http";
import { writeFileSync } from "node:fs";

createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    const { path, data } = JSON.parse(body);
    writeFileSync(path, Buffer.from(String(data).split(",")[1] ?? "", "base64"));
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });
}).listen(8765, "127.0.0.1");
