const net = require("net");// Import the net module to create a TCP server
const fs = require("fs");// Import the fs module to handle file system operations
const path = require("path");// Import the path module to handle file and directory paths   

const port = 4221;
let staticDir = process.argv.includes("--directory")
  ? process.argv[process.argv.indexOf("--directory") + 1]
  : process.cwd();

const initiateServer = () => {  // Create a TCP server
  const srv = net.createServer();

  srv.on("connection", (sock) => {
    let accumulated = "";

    sock.on("data", (buffer) => {
      accumulated += buffer.toString();

      const splitPoint = accumulated.indexOf("\r\n\r\n");
      if (splitPoint === -1) return;

      const headerPart = accumulated.slice(0, splitPoint);
      const bodyPart = accumulated.slice(splitPoint + 4);

      const lines = headerPart.split("\r\n");
      const [method, pathUrl] = lines[0].split(" ");
      const headers = {};

      for (let i = 1; i < lines.length; i++) {
        const [key, value] = lines[i].split(": ");
        if (key && value) headers[key.toLowerCase()] = value;
      }

      if (method === "POST" && pathUrl.startsWith("/files/")) {
        const fileName = pathUrl.replace("/files/", "");
        const fileTarget = path.join(staticDir, fileName);

        const declaredLength = parseInt(headers["content-length"], 10);
        const incomingBody = bodyPart.slice(0, declaredLength);

        fs.writeFileSync(fileTarget, incomingBody);

        const reply = `HTTP/1.1 201 Created\r\nContent-Length: 0\r\n\r\n`;
        sock.write(reply);
        sock.end();
        return;
      }

      if (method === "GET" && pathUrl.startsWith("/echo/")) {
        const message = pathUrl.slice("/echo/".length);
        const encodings = headers["accept-encoding"]
          ? headers["accept-encoding"].split(",").map(e => e.trim())
          : [];

        const useGzip = encodings.includes("gzip");

        let responseHeaders = [
          "HTTP/1.1 200 OK",
          "Content-Type: text/plain",
          `Content-Length: ${Buffer.byteLength(message)}`,
        ];
        if (useGzip) responseHeaders.push("Content-Encoding: gzip");

        const res = `${responseHeaders.join("\r\n")}\r\n\r\n${message}`;
        sock.write(res);
        sock.end();
        return;
      }

      // Default fallback
      sock.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
      sock.end();
    });
  });

  srv.listen(port, () => {
    console.log(`📡 Server on http://localhost:${port} | Static: ${staticDir}`); //Server is listening
  });
};

initiateServer();