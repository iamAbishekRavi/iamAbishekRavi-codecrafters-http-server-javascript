const net = require("net");
const fs = require("fs");
const path = require("path");

const directoryArgIndex = process.argv.indexOf("--directory");
const baseDir = directoryArgIndex !== -1 ? process.argv[directoryArgIndex + 1] : "./app";

const server = net.createServer((socket) => {
  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString();

    if (!buffer.includes("\r\n\r\n")) return;

    const [headerPart, bodyPart] = buffer.split("\r\n\r\n");
    const headers = headerPart.split("\r\n");
    const [method, url, version] = headers[0].split(" ");

    const headerMap = {};
    for (let i = 1; i < headers.length; i++) {
      const [key, value] = headers[i].split(":").map(s => s.trim());
      headerMap[key.toLowerCase()] = value;
    }

    const contentLength = parseInt(headerMap["content-length"] || "0");
    const fullBody = bodyPart || "";

    // Wait for full body if not complete
    if (fullBody.length < contentLength) return;

    // Handle /
    if (url === "/") {
      socket.write("HTTP/1.1 200 OK\r\n");
      socket.write("Content-Type: text/plain\r\n");
      socket.write("Content-Length: 0\r\n");
      socket.write("\r\n");
      socket.end();
      return;
    }

    // Handle /echo/{str}
    if (url.startsWith("/echo/")) {
      const str = url.slice("/echo/".length);
      const acceptEncoding = headerMap["accept-encoding"] || "";
      const encodings = acceptEncoding.split(",").map(e => e.trim());
      const useGzip = encodings.includes("gzip");

      const body = str;
      socket.write("HTTP/1.1 200 OK\r\n");
      socket.write("Content-Type: text/plain\r\n");
      if (useGzip) socket.write("Content-Encoding: gzip\r\n");
      socket.write(`Content-Length: ${Buffer.byteLength(body)}\r\n`);
      socket.write("\r\n");
      socket.write(body);
      socket.end();
      return;
    }

    // Handle /user-agent
    if (url === "/user-agent") {
      const userAgent = headerMap["user-agent"] || "";
      const body = userAgent;
      socket.write("HTTP/1.1 200 OK\r\n");
      socket.write("Content-Type: text/plain\r\n");
      socket.write(`Content-Length: ${Buffer.byteLength(body)}\r\n`);
      socket.write("\r\n");
      socket.write(body);
      socket.end();
      return;
    }

    // Handle GET /files/{filename}
    if (method === "GET" && url.startsWith("/files/")) {
      const filePath = path.join(baseDir, url.slice("/files/".length));
      fs.readFile(filePath, (err, data) => {
        if (err) {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        } else {
          socket.write("HTTP/1.1 200 OK\r\n");
          socket.write("Content-Type: application/octet-stream\r\n");
          socket.write(`Content-Length: ${data.length}\r\n`);
          socket.write("\r\n");
          socket.write(data);
        }
        socket.end();
      });
      return;
    }

    // Handle POST /files/{filename}
    if (method === "POST" && url.startsWith("/files/")) {
      const filePath = path.join(baseDir, url.slice("/files/".length));
      const body = buffer.split("\r\n\r\n")[1];
      fs.writeFile(filePath, body.slice(0, contentLength), (err) => {
        if (err) {
          socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        } else {
          socket.write("HTTP/1.1 201 Created\r\n\r\n");
        }
        socket.end();
      });
      return;
    }

    // Fallback 404
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.end();
  });
});

server.listen(4221, () => {
  console.log("🚀 Server running on http://localhost:4221");
});
