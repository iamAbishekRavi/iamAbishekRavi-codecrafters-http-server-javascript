const net = require("net"); // TCP server module
const fs = require("fs"); // File system module
const path = require("path");

const port = 4221;
const staticDir = process.argv.includes("--directory") //set static directory from command line argument
  ? process.argv[process.argv.indexOf("--directory") + 1] 
  : process.cwd();

const server = net.createServer((socket) => {
  let data = "";

  socket.on("data", (chunk) => {
    data += chunk.toString();

    const headerEnd = data.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;

    const headerPart = data.slice(0, headerEnd);
    const bodyPart = data.slice(headerEnd + 4);

    const lines = headerPart.split("\r\n");
    const [method, url] = lines[0].split(" ");
    const headers = {};
    lines.slice(1).forEach((line) => {
      const [key, value] = line.split(": ");
      if (key && value) headers[key.toLowerCase()] = value.trim();
    });

    // Handles POST /files/{filename}
    if (method === "POST" && url.startsWith("/files/")) {
      const filename = url.replace("/files/", "");
      const fullPath = path.join(staticDir, filename);
      const contentLength = parseInt(headers["content-length"], 10);
      const fileData = bodyPart.slice(0, contentLength);

      fs.writeFile(fullPath, fileData, () => {
        const res = `HTTP/1.1 201 Created\r\nContent-Length: 0\r\n\r\n`;
        socket.write(res);
        socket.end();
      });
      return;
    }

    // Handles GET /files/{filename}
    if (method === "GET" && url.startsWith("/files/")) {
      const filename = url.replace("/files/", "");
      const fullPath = path.join(staticDir, filename);

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath);
        const res = [
          "HTTP/1.1 200 OK",
          "Content-Type: application/octet-stream",
          `Content-Length: ${content.length}`,
          "",
          "",
        ].join("\r\n");
        socket.write(res);
        socket.write(content);
        socket.end();
      } else {
        socket.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
        socket.end();
      }
      return;
    }

    // Handle /echo/{str} endpoints
    if (method === "GET" && url.startsWith("/echo/")) {
      const msg = url.slice("/echo/".length);
      const encodings = headers["accept-encoding"]
        ? headers["accept-encoding"].split(",").map(e => e.trim())
        : [];
      const useGzip = encodings.includes("gzip");

      const resHeaders = [
        "HTTP/1.1 200 OK",
        "Content-Type: text/plain",
        `Content-Length: ${Buffer.byteLength(msg)}`,
      ];
      if (useGzip) resHeaders.push("Content-Encoding: gzip");

      const response = `${resHeaders.join("\r\n")}\r\n\r\n${msg}`;
      socket.write(response);
      socket.end();
      return;
    }

    // Fallback
    socket.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
    socket.end();
  });
});

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
