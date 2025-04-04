const net = require("net");
const fs = require("fs");
const path = require("path");

// Parse command-line arguments
const args = process.argv;
const dirIndex = args.indexOf("--directory");
const filesDirectory = dirIndex !== -1 ? args[dirIndex + 1] : "/tmp"; // Default directory if not provided

const server = net.createServer((socket) => {
    console.log("New client connected");

    socket.on("data", (data) => {
        const request = data.toString();
        console.log(`Request received:\n${request}`);

        // Match root route "/"
        if (request.startsWith("GET / HTTP/")) {
            const response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\n\r\nOK";
            socket.write(response);
            socket.end();
            return;
        }

        // Match "/user-agent" and extract the User-Agent header
        if (request.startsWith("GET /user-agent HTTP/")) {
            const userAgentMatch = request.match(/User-Agent: (.+)\r\n/);
            if (!userAgentMatch) {
                socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
                socket.end();
                return;
            }

            const userAgent = userAgentMatch[1];
            const contentLength = Buffer.byteLength(userAgent, "utf-8");

            const response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${userAgent}`;
            socket.write(response);
            socket.end();
            return;
        }

        // Match "/files/{filename}"
        const fileMatch = request.match(/^GET \/files\/([^ ]+) HTTP/);
        if (fileMatch) {
            const filename = fileMatch[1];
            const filePath = path.join(filesDirectory, filename);

            fs.stat(filePath, (err, stats) => {
                if (err || !stats.isFile()) {
                    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
                    socket.end();
                    return;
                }

                fs.readFile(filePath, (err, content) => {
                    if (err) {
                        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
                        socket.end();
                        return;
                    }

                    const contentLength = Buffer.byteLength(content, "utf-8");
                    const responseHeaders = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${contentLength}\r\n\r\n`;

                    socket.write(responseHeaders);
                    socket.write(content);
                    socket.end();
                });
            });
            return;
        }

        // Default 404 Response
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.end();
    });

    socket.on("end", () => console.log("Client disconnected"));
});

server.listen(4221, "0.0.0.0", () => {
    console.log("Server running on port 4221");
});
