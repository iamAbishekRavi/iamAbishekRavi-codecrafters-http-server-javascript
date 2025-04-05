const http = require("http");//import http from "http";
const fs = require("fs");//import fs from "fs";
const zlib = require("zlib");//import zlib from "zlib";
const url = require("url");//import url from "url";
const path = require("path");//import path from "path";

const PORT = 4221;
const ROOT_DIR = process.argv.includes("--directory")
  ? process.argv[process.argv.indexOf("--directory") + 1]
  : path.join(__dirname, "app");

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }

  if (pathname.startsWith("/echo/")) {
    const message = decodeURIComponent(pathname.slice(6));
    const acceptEncoding = req.headers["accept-encoding"] || "";
    const encodings = acceptEncoding.split(",").map(e => e.trim());

    const shouldGzip = encodings.includes("gzip");// || encodings.includes("x-gzip");

    if (shouldGzip) {
      const compressed = zlib.gzipSync(Buffer.from(message));
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Content-Encoding": "gzip",
        "Content-Length": compressed.length
      });
      res.end(compressed);
    } else {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(message)
      });
      res.end(message);
    }
    return;
  }

  if (pathname === "/user-agent") {
    const ua = req.headers["user-agent"] || "";
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(ua)
    });
    res.end(ua);
    return;
  }

  if (pathname.startsWith("/files/")) {
    const filePath = path.join(ROOT_DIR, pathname.replace("/files/", ""));
    if (req.method === "GET") {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Length": content.length
        });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end();
      }
    } else if (req.method === "POST") {
      let body = [];
      req
        .on("data", chunk => body.push(chunk))
        .on("end", () => {
          const buffer = Buffer.concat(body);
          fs.writeFileSync(filePath, buffer);
          res.writeHead(201);
          res.end();
        });
    } else {
      res.writeHead(405);
      res.end();
    }
    return;
  }

  // Default 404
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
