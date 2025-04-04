const net = require("net");
const fs = require("fs");
const path = require("path");

// Parse command-line arguments to get the directory
const args = process.argv;
const dirIndex = args.indexOf("--directory");
const filesDirectory = dirIndex !== -1 ? args[dirIndex + 1] : null;

if (!filesDirectory) {
    console.error("Error: No directory specified. Use --directory <path>");
    process.exit(1);
}

const server = net.createServer((socket) => {
    console.log("New client connected");

    socket.on("data", (data) => {
        const request = data.toString();
        console.log(`Request received:\n${request}`);

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
    console.log(`Server running on port 4221, serving files from ${filesDirectory}`);
});
