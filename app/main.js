const http = require("http"); // Importing the http module to create an HTTP server
const zlib = require("zlib"); // Importing the zlib module for compression and decompression
const fs = require("fs"); // Importing the fs module to interact with the file system
const path = require("path"); //    Importing the path module to work with file and directory paths

const port = 4221;
const serveDir = process.argv.includes("--directory")
  ? process.argv[process.argv.indexOf("--directory") + 1]
  : "./app";

const server = http.createServer((req, res) => {
  const { method, url, headers } = req;

  // Echo endpoint
  if (url.startsWith("/echo/")) {
    const message = url.slice("/echo/".length);
    const acceptEncoding = headers["accept-encoding"] || "";
    const encodings = acceptEncoding.split(",").map(e => e.trim());

    if (encodings.includes("gzip")) {
      const compressed = zlib.gzipSync(message);
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Content-Encoding": "gzip",
        "Content-Length": compressed.length,
      });
      res.end(compressed);
    } else {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Content-Length": message.length,
      });
      res.end(message);
    }
    return;
  }

  // User-Agent header routes
  if (url === "/user-agent") {
    const ua = headers["user-agent"] || "";
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(ua),
     });
    res.end(ua);
    return;
  }

  // File routes
  if (url.startsWith("/files/")) {
    const filePath = path.join(serveDir, url.replace("/files/", ""));
    if (method === "GET") {
      if (!fs.existsSync(filePath))  {
        res.writeHead(404);
        res.end();
      } else {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Length": content.length,
        });
        res.end(content);
      }
    } else if (method === "POST") {
      const chunks = [];
      req.on("data", chunk => chunks.push(chunk));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        fs.writeFileSync(filePath, body);
        res.writeHead(201);
        res.end();
      });
    }
    return;
  }

  // Root route for concurrent tests
  if (url === "/") {
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": "2",
    });
    res.end("OK");
    return;
  }

  // Fallback 404
  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
//end of code 