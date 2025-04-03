const net = require('net');

const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const request = data.toString();
        
        // Match the request path
        const echoMatch = request.match(/GET \/User-Agent\/([^ ]+) HTTP/);
    

        if (echoMatch) {
            // Handle "/echo/{str}"
            const responseString = echoMatch[1];
            const contentLength = Buffer.byteLength(responseString, 'utf-8');
            const responseHeaders = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n`;

            socket.write(responseHeaders + responseString);
            socket.end();
            return;
        }

server.listen(4221, '0.0.0.0', () => {
    console.log('Server running on port 4221');
});

});
});