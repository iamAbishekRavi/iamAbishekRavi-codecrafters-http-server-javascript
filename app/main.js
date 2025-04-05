const net = require("net");
const fs = require("fs");
const zlib = require("zlib");

const PORT = 4221;

const directory = process.argv.includes("--directory") ? process.argv[process.argv.indexOf("--directory") + 1] : null;

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString();
    const [headerPart, bodyPart] = request.split("\r\n\r\n");
    const headerLines = headerPart.split("\r\n");
    const [method, path] = headerLines[0].split(" ");

    const headers = {};
    for (let i = 1; i < headerLines.length; i++) {
      const [key, ...rest] = headerLines[i].split(":");
      headers[key.trim().toLowerCase()] = rest.join(":").trim();
    }

    const respond = (statusCode, statusText, headers, body) => {
      const headerStrings = Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
      const response = `HTTP/1.1 ${statusCode} ${statusText}\r\n${headerStrings.join("\r\n")}\r\n\r\n`;
      socket.write(response);
      if (body) socket.write(body);
      socket.end();
    };

    if (method === "GET" && path === "/") {
      respond(200, "OK", { "Content-Type": "text/plain", "Content-Length": "0" });
    }

    else if (method === "GET" && path.startsWith("/echo/")) {
      const message = path.slice(6);
      const acceptEncoding = headers["accept-encoding"];
      const body = Buffer.from(message);

      if (acceptEncoding?.includes("gzip")) {
        const compressed = zlib.gzipSync(body);
        respond(200, "OK", {
          "Content-Type": "text/plain",
          "Content-Encoding": "gzip",
          "Content-Length": compressed.length
        }, compressed);
      } else {
        respond(200, "OK", {
          "Content-Type": "text/plain",
          "Content-Length": body.length
        }, body);
      }
    }

    else if (method === "GET" && path === "/user-agent") {
      const userAgent = headers["user-agent"] || "";
      const body = Buffer.from(userAgent);
      respond(200, "OK", {
        "Content-Type": "text/plain",
        "Content-Length": body.length
      }, body);
    }

    else if (method === "POST" && path.startsWith("/files/") && directory) {
      const filename = path.split("/files/")[1];
      const filepath = `${directory}/${filename}`;
      const contentLength = parseInt(headers["content-length"], 10);
      const bodyBuffer = Buffer.from(bodyPart || "", "utf8");

      if (bodyBuffer.length >= contentLength) {
        fs.writeFileSync(filepath, bodyBuffer.slice(0, contentLength));
        respond(201, "Created", { "Content-Type": "text/plain", "Content-Length": "0" });
      } else {
        socket.once("data", (moreData) => {
          const totalBody = Buffer.concat([bodyBuffer, moreData]).slice(0, contentLength);
          fs.writeFileSync(filepath, totalBody);
          respond(201, "Created", { "Content-Type": "text/plain", "Content-Length": "0" });
        });
      }
    }

    else if (method === "GET" && path.startsWith("/files/") && directory) {
      const filename = path.split("/files/")[1];
      const filepath = `${directory}/${filename}`;
      if (fs.existsSync(filepath)) {
        const body = fs.readFileSync(filepath);
        respond(200, "OK", {
          "Content-Type": "application/octet-stream",
          "Content-Length": body.length
        }, body);
      } else {
        respond(404, "Not Found", { "Content-Type": "text/plain", "Content-Length": "0" });
      }
    }

    else {
      respond(404, "Not Found", { "Content-Type": "text/plain", "Content-Length": "0" });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});