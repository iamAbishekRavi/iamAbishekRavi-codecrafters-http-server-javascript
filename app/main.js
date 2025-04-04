socket.on("data", (data) => {
    const request = data.toString();
    console.log(`Request received:\n${request}`);

    // Match "/"
    if (request.startsWith("GET / HTTP/")) {
        const response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\n\r\nOK";
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

                const contentLength = Buffer.byteLength(content, 'utf-8');
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
