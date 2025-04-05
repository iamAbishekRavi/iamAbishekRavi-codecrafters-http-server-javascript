const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PORT = 4221;
const directoryFlagIndex = process.argv.indexOf("--directory");
const serveDirectory =
  directoryFlagIndex !== -1 ? process.argv[directoryFlagIndex + 1] : "/app/app";

const server = http.createServer((req, res) => {
  const { method, url, headers } = req;

  // Handle root path for anti-cheat test
  if (url === "/" && method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": "0",
    });
    res.end();
    return;
  }

  // Handle /echo/{str}
  if (url.startsWith("/echo/") && method === "GET") {
    const str = decodeURIComponent(url.split("/echo/")[1]);
    const acceptEncoding = headers["accept-encoding"] || "";

    const supportsGzip = acceptEncoding
      .split(",")
      .map((e) => e.trim())
      .includes("gzip");

    if (supportsGzip) {
      const compressed = zlib.gzipSync(Buffer.from(str));
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Content-Encoding": "gzip",
        "Content-Length": compressed.length,
      });
      res.end(compressed);
    } else {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(str),
      });
      res.end(str);
    }
    return;
  }

  // Handle /user-agent
  if (url === "/user-agent" && method === "GET") {
    const userAgent = headers["user-agent"] || "";
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(userAgent),
    });
    res.end(userAgent);
    return;
  }

  // Handle /files/{filename}
  if (url.startsWith("/files/")) {
    const filename = decodeURIComponent(url.split("/files/")[1]);
    const filepath = path.join(serveDirectory, filename);

    if (method === "GET") {
      fs.readFile(filepath, (err, data) => {
        if (err) {
          res.writeHead(404, {
            "Content-Type": "text/plain",
            "Content-Length": "0",
          });
          res.end();
        } else {
          res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": data.length,
          });
          res.end(data);
        }
      });
      return;
    }

    if (method === "POST") {
      const contentLength = parseInt(headers["content-length"] || "0", 10);
      const chunks = [];

      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const body = Buffer.concat(chunks, contentLength);
        fs.writeFile(filepath, body, (err) => {
          if (err) {
            res.writeHead(500);
            res.end();
          } else {
            res.writeHead(201, {
              "Content-Length": "0",
            });
            res.end();
          }
        });
      });
      return;
    }
  }

  // Fallback 404
  res.writeHead(404, {
    "Content-Type": "text/plain",
    "Content-Length": "0",
  });
  res.end();
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
