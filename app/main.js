const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PORT = 4221;
const baseDirectory = process.argv.includes("--directory")
  ? process.argv[process.argv.indexOf("--directory") + 1]
  : path.join(__dirname, "app");

const server = http.createServer(async (req, res) => {
  const { method, url, headers } = req;

  // /echo/:something
  if (url.startsWith("/echo/")) {
    const text = decodeURIComponent(url.slice(6));
    const acceptEncoding = headers["accept-encoding"] || "";

    res.setHeader("Content-Type", "text/plain");
    if (acceptEncoding.includes("gzip")) {
      const gzipped = zlib.gzipSync(text);
      res.writeHead(200, {
        "Content-Encoding": "gzip",
        "Content-Length": gzipped.length,
      });
      res.end(gzipped);
    } else {
      res.writeHead(200, {
        "Content-Length": Buffer.byteLength(text),
      });
      res.end(text);
    }
    return;
  }

  // /user-agent
  if (url === "/user-agent") {
    const userAgent = headers["user-agent"] || "";
    const buffer = Buffer.from(userAgent, "utf-8");
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
    return;
  }

  // /files/:filename
  if (url.startsWith("/files/")) {
    const filename = url.slice(7);
    const filePath = path.join(baseDirectory, filename);

    if (method === "GET") {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
        } else {
          res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": data.length,
          });
          res.end(data);
        }
      });
    } else if (method === "POST") {
      const fileStream = fs.createWriteStream(filePath);
      req.pipe(fileStream);
      req.on("end", () => {
        res.writeHead(201);
        res.end();
      });
    }
    return;
  }

  // Fallback for root and others
  if (url === "/") {
    const message = "Welcome to the HTTP server!";
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(message),
    });
    res.end(message);
    return;
  }

  // 404 for unknown paths
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
