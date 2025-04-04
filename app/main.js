const net = require("net");

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

        // Match "/echo/{string}"
        const echoMatch = request.match(/^GET \/echo\/([^ ]+) HTTP/);
        if (echoMatch) {
            const echoString = echoMatch[1];
            const contentLength = Buffer.byteLength(echoString, "utf-8");

            const response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${echoString}`;
            socket.write(response);
            socket.end();
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
