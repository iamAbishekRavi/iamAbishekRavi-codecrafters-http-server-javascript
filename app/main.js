const net = require("net");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const args = process.argv;
const dirIndex = args.indexOf("--directory");
const filesDirectory = dirIndex !== -1 ? args[dirIndex + 1] : null;

const server = net.createServer((socket) => {
    console.log("New client connected");

    let requestData = "";

    socket.on("data", (chunk) => {
        requestData += chunk.toString();

        // Check if we received the full request
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
    const acceptEncodingMatch = request.match(/Accept-Encoding: (.+)\r\n/);

    let contentEncoding = null;
    if (acceptEncodingMatch) {
        const encoding = acceptEncodingMatch[1].trim();
        if (encoding === "gzip") {
            contentEncoding = "gzip";
        }
    }

    // Handle `/echo/{message}`
    if (echoMatch) {
        const responseStr = echoMatch[1];
        let responseBody = responseStr;
        let headers = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n`;

        if (contentEncoding === "gzip") {
            responseBody = zlib.gzipSync(responseStr);
            headers += `Content-Encoding: gzip\r\n`;
        }

        headers += `Content-Length: ${Buffer.byteLength(responseBody)}\r\n\r\n`;
        socket.write(headers);
        socket.write(responseBody);
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

            const fileStream = fs.createReadStream(filePath);
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${stats.size}\r\n\r\n`);
            fileStream.pipe(socket, { end: false });
            fileStream.on("end", () => socket.end());
        });
        return;
    }

    // Handle `POST /files/{filename}`
    if (filePostMatch && filesDirectory) {
        const filename = filePostMatch[1];
        const filePath = path.join(filesDirectory, filename);

        const bodyMatch = request.split("\r\n\r\n")[1];
        if (!bodyMatch) {
            socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
            socket.end();
            return;
        }

        fs.writeFile(filePath, bodyMatch, (err) => {
            if (err) {
                socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
            } else {
                socket.write("HTTP/1.1 201 Created\r\n\r\n");
            }
            socket.end();
        });
        return;
    }

    // Handle unknown paths
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.end();
}

// Ensure directory is provided
if (!filesDirectory) {
    console.error("Error: No directory specified. Use --directory <path>");
    process.exit(1);
}

server.listen(4221, () => console.log("Server running on port 4221"));
