const net = require("net");
const fs = require("fs");
const path = require("path");

const args = process.argv;
const dirIndex = args.indexOf("--directory");
const filesDirectory = dirIndex !== -1 ? args[dirIndex + 1] : null;

const server = net.createServer((socket) => {
    console.log("New client connected");

    socket.on("data", (data) => {
        const request = data.toString();
        console.log(`Request received:\n${request}`);

        const echoMatch = request.match(/^GET \/echo\/([^ ]+) HTTP/);
        const rootMatch = request.match(/^GET \/ HTTP/);
        const userAgentMatch = request.match(/^GET \/user-agent HTTP/);
        const fileMatch = request.match(/^GET \/files\/([^ ]+) HTTP/);

        // Handle `/echo/{str}`
        if (echoMatch) {
            const responseStr = echoMatch[1];
            const contentLength = Buffer.byteLength(responseStr, "utf-8");
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${responseStr}`);
            socket.end();
            return;
        }

        // Handle `/` root path
        if (rootMatch) {
            socket.write("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n");
            socket.end();
            return;
        }

        // Handle `/user-agent`
        if (userAgentMatch) {
            const userAgentHeader = request.match(/User-Agent: (.+)\r\n/);
            if (userAgentHeader) {
                const userAgent = userAgentHeader[1];
                const contentLength = Buffer.byteLength(userAgent, "utf-8");
                socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${userAgent}`);
                socket.end();
            } else {
                socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
                socket.end();
            }
            return;
        }

        // Handle `/files/{filename}`
        if (fileMatch && filesDirectory) {
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
                    socket.write(`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${contentLength}\r\n\r\n`);
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
    console.log(`Server running on port 4221${filesDirectory ? `, serving files from ${filesDirectory}` : ""}`);
});
