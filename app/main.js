const net = require('net');
const fs = require('fs');
const path = require('path');

const server = net.createServer((socket) => {
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    const request = buffer.toString();
    const headerEndIndex = request.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) return; // Wait for full headers

    const [headerPart] = request.split('\r\n\r\n');
    const [requestLine, ...headerLines] = headerPart.split('\r\n');
    const [method, requestPath] = requestLine.split(' ');

    const headers = {};
    for (const line of headerLines) {
      const [key, value] = line.split(': ');
      if (key && value) {
        headers[key.toLowerCase()] = value;
      }
    }

    const contentLength = parseInt(headers['content-length'], 10);
    if (isNaN(contentLength)) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.end();
      return;
    }

    const bodyStart = headerEndIndex + 4;
    const totalLength = bodyStart + contentLength;

    if (buffer.length < totalLength) return; // Wait for full body

    const body = buffer.slice(bodyStart, totalLength);

    if (method === 'POST' && requestPath.startsWith('/files/')) {
      const filename = requestPath.slice(7);
      const directory = process.argv.includes('--directory')
        ? process.argv[process.argv.indexOf('--directory') + 1]
        : __dirname;
      const filePath = path.join(directory, filename);

      fs.writeFile(filePath, body, (err) => {
        if (err) {
          socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        } else {
          socket.write('HTTP/1.1 201 Created\r\n\r\n');
        }
        socket.end();
      });
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.end();
    }
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

const PORT = 4221;
server.listen(PORT, () => {
  const directory = process.argv.includes('--directory')
    ? process.argv[process.argv.indexOf('--directory') + 1]
    : __dirname;

  console.log(`Server running at http://localhost:${PORT}/, serving files from ${directory}`);
});
