const net = require('net');

const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const request = data.toString();
        
        // Extract the requested string from the request
        const match = request.match(/GET \/echo\/([^ ]+) HTTP/);
        if (!match) {
            socket.end('HTTP/1.1 404 Bad Request\r\n\r\n');
            return;
        }

        const responseString = match[1];
        const contentLength = Buffer.byteLength(responseString, 'utf-8');
        const responseHeaders = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n`;

        // Send response
        socket.write(responseHeaders + responseString);
        socket.end();
    });
});

server.listen(4221, '0.0.0.0', () => {
    console.log('Server running on port 4221');
});
