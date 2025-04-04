const net = require("net");
const fs = require("fs");
const path = require("path");

const args = process.argv;
const dirIndex = args.indexOf("--directory");
const filesDirectory = dirIndex !== -1 ? args[dirIndex + 1] : null;

const server = net.createServer((socket) => {
    console.log("New client connected");

    let requestData = "";

    socket.on("data", (chunk) => {
        requestData += chunk.toString();

        // Check if we have received the full request
        if (requestData.includes("\r\n\r\n")) {
            handleRequest(socket, requestData);
        }
    });

    socket.on("end", () => console.log("Client disconnected"));
});

function handleRequest(socket, request) {
    console.log(`Request received:\n${request}`);

    const echoMatch = request.match(/^GET \/echo\/([^ ]+) HTTP/);
    const rootMatch = request.match(/^GET \/ HTTP/);
    const userAgentMatch = request.match(/^GET \/user-agent HTTP/);
    const fileGetMatch = request.match(/^GET \/files\/([^ ]+) HTTP/);
    const filePostMatch = request.match(/^POST \/files\/([^ ]+) HTTP/);

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

    // Handle `GET /files/{filename}`
    if (fileGetMatch && filesDirectory) {
        const filename = fileGetMatch[1];
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

    // Handle `POST /files/{filename}`
    if (filePostMatch && filesDirectory) {
        const filename = filePostMatch[1];
        const filePath = path.join(filesDirectory, filename);

        // Extract the request body
        const contentStart = request.indexOf("\r\n\r\n") + 4;
        const body = request.substring(contentStart);
        const contentLengthMatch = request.match(/Content-Length: (\d+)\r\n/);
        const expectedLength = contentLengthMatch ? parseInt(contentLengthMatch[1], 10) : body.length;

        if (Buffer.byteLength(body, "utf-8") !== expectedLength) {
            socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
            socket.end();
            return;
        }

        fs.writeFile(filePath, body, (err) => {
            if (err) {
                socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
                socket.end();
                return;
            }

            socket.write("HTTP/1.1 201 Created\r\n\r\n");
            socket.end();
        });
        return;
    }

    // Default 404 Response
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.end();
}

server.listen(4221, "0.0.0.0", () => {
    console.log(`Server running on port 4221${filesDirectory ? `, serving files from ${filesDirectory}` : ""}`);
});
