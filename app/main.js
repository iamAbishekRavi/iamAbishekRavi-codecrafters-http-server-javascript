const net = require('net');

const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const request = data.toString();
        
        // Match the request for "/echo/{string}"
        const echoMatch = request.match(/^GET \/echo\/([^ ]+) HTTP/);
        if (echoMatch) {
            const responseString = echoMatch[1];
            const contentLength = Buffer.byteLength(responseString, 'utf-8');

            const responseHeaders = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n`;
            
            socket.write(responseHeaders + responseString);
            socket.end();
            return;
        }

        // Handle unknown routes with 404
        socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
    });
});

server.listen(4221, '0.0.0.0', () => {
    console.log('Server running on port 4221');
});
