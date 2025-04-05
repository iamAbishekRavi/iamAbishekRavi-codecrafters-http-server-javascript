// server.js
const net = require("net");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const PORT = 4221;
let serveDirectory = path.resolve("./app"); // Default dir

// Simple utility to parse headers from raw HTTP request
function parseHeaders(rawHeaders) {
  const headers = {};
  const lines = rawHeaders.split("\r\n");
  for (const line of lines) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length > 0) {
      headers[key.trim().toLowerCase()] = rest.join(":").trim();
    }
  }
  return headers;
}

// Simple utility to generate response
function buildResponse(statusCode, headers, body) {
  const statusText = {
    200: "OK",
    201: "Created",
    404: "Not Found",
  }[statusCode] || "OK";

  let response = `HTTP/1.1 ${statusCode} ${statusText}\r\n`;

  for (const key in headers) {
    response += `${key}: ${headers[key]}\r\n`;
  }

  response += `\r\n`;

  return Buffer.concat([Buffer.from(response), body]);
}

// Create the TCP server
const server = net.createServer((socket) => {
  let requestData = "";

  socket.on("data", (chunk) => {
    requestData += chunk.toString();

    // Check for double CRLF = end of headers
    if (requestData.includes("\r\n\r\n")) {
      const [head, bodyPart] = requestData.split("\r\n\r\n");
      const [requestLine, ...headerLines] = head.split("\r\n");
      const [method, url, protocol] = requestLine.split(" ");
      const headers = parseHeaders(headerLines.join("\r\n"));
      const contentLength = parseInt(headers["content-length"] || "0", 10);
      const acceptEncoding = (headers["accept-encoding"] || "").split(",").map(e => e.trim());

      let bodyBuffer = Buffer.from(bodyPart);

      const respond = (statusCode, headers, body = Buffer.alloc(0)) => {
        const res = buildResponse(statusCode, headers, body);
        socket.write(res);
        socket.end();
      };

      const tryGzip = (data) => {
        return new Promise((resolve, reject) => {
          zlib.gzip(data, (err, compressed) => {
            if (err) reject(err);
            else resolve(compressed);
          });
        });
      };

      const handleRequest = async () => {
        // Route: /
        if (method === "GET" && url === "/") {
          return respond(200, {
            "Content-Type": "text/plain",
            "Content-Length": "0",
          });
        }

        // Route: /echo/{msg}
        if (method === "GET" && url.startsWith("/echo/")) {
          let msg = url.split("/echo/")[1];
          let buffer = Buffer.from(msg);

          // Check if gzip is accepted
          if (acceptEncoding.includes("gzip")) {
            const gzipped = await tryGzip(buffer);
            return respond(200, {
              "Content-Type": "text/plain",
              "Content-Encoding": "gzip",
              "Content-Length": gzipped.length,
            }, gzipped);
          }

          return respond(200, {
            "Content-Type": "text/plain",
            "Content-Length": buffer.length,
          }, buffer);
        }

        // Route: /user-agent
        if (method === "GET" && url === "/user-agent") {
          const ua = headers["user-agent"] || "";
          const uaBuffer = Buffer.from(ua);
          return respond(200, {
            "Content-Type": "text/plain",
            "Content-Length": uaBuffer.length,
          }, uaBuffer);
        }

        // Route: /files/{filename}
        if (url.startsWith("/files/")) {
          const filePath = path.join(serveDirectory, url.split("/files/")[1]);

          if (method === "GET") {
            if (!fs.existsSync(filePath)) return respond(404, { "Content-Type": "text/plain", "Content-Length": "0" });
            const data = fs.readFileSync(filePath);
            return respond(200, {
              "Content-Type": "application/octet-stream",
              "Content-Length": data.length,
            }, data);
          }

          if (method === "POST") {
            // Wait for full body
            socket.once("data", (chunk2) => {
              bodyBuffer = Buffer.concat([bodyBuffer, chunk2]);
              fs.writeFileSync(filePath, bodyBuffer);
              return respond(201, {
                "Content-Type": "text/plain",
                "Content-Length": "0",
              });
            });
            return;
          }
        }

        // Unknown route
        return respond(404, {
          "Content-Type": "text/plain",
          "Content-Length": "0",
        });
      };

      handleRequest().catch((err) => {
        console.error("Server error:", err);
        respond(500, { "Content-Type": "text/plain", "Content-Length": "0" });
      });
    }
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

// Handle optional directory flag
if (process.argv.includes("--directory")) {
  const dirIndex = process.argv.indexOf("--directory");
  if (dirIndex !== -1 && process.argv[dirIndex + 1]) {
    serveDirectory = path.resolve(process.argv[dirIndex + 1]);
  }
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});