const net = require("net");

const PORT = 4221;

// Create the server and listen for connections
const startServer = () => {
  const listener = net.createServer();

  listener.on("connection", (conn) => {
    conn.on("data", (chunk) => {
      const incoming = chunk.toString();
      const lines = incoming.split("\r\n");

      const [method, url] = lines[0].split(" ");
      const headers = {};

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === "") break;
        const [hKey, hVal] = line.split(": ");
        if (hKey && hVal) {
          headers[hKey.toLowerCase()] = hVal;
        }
      }

      // Parse Accept-Encoding
      const acceptList = headers["accept-encoding"]
        ? headers["accept-encoding"].split(",").map(enc => enc.trim().toLowerCase())
        : [];

      const supportsGzip = acceptList.includes("gzip");

      let msg = "";
      if (url.startsWith("/echo/")) {
        msg = url.substring("/echo/".length);
      }

      const rawPayload = msg; // The payload to be sent back
      const meta = {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(rawPayload),
      };

      if (supportsGzip) {
        meta["Content-Encoding"] = "gzip";
      }

      const headerBlock = Object.entries(meta) // Create the header block
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n");

      const finalResponse = `HTTP/1.1 200 OK\r\n${headerBlock}\r\n\r\n${rawPayload}`;

      conn.write(finalResponse);
      conn.end();
    });
  });

  listener.listen(PORT, () => {
  console.log(`🔥 Server lit at http://localhost:${PORT}/`); //server is listening to 
  });
};

startServer();
