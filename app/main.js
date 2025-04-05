const net = require('net');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Default directory to serve files from
let baseDirectory = __dirname;

// Parse command-line arguments to set the base directory
const args = process.argv.slice(2);
const dirIndex = args.indexOf('--directory');
if (dirIndex !== -1 && args.length > dirIndex + 1) {
  baseDirectory = args[dirIndex + 1];
}

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = data.toString();
    const [requestLine, ...headerLines] = request.split('\r\n');
    const [method, requestPath] = requestLine.split(' ');

    // Parse headers into an object
    const headers = {};
    for (const line of headerLines) {
      const [key, value] = line.split(': ');
      if (key && value) {
        headers[key.toLowerCase()] = value;
      }
    }

    // Handle GET requests to /echo/{message}
    if (method === 'GET' && requestPath.startsWith('/echo/')) {
      const message = requestPath.slice(6);
      const acceptEncoding = headers['accept-encoding'] || '';

      if (acceptEncoding.includes('gzip')) {
        zlib.gzip(message, (err, compressedMessage) => {
          if (err) {
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
          } else {
            socket.write(
              `HTTP/1.1 200 OK\r\n` +
              `Content-Type: text/plain\r\n` +
              `Content-Encoding: gzip\r\n` +
              `Content-Length: ${compressedMessage.length}\r\n\r\n`
            );
            socket.write(compressedMessage);
          }
          socket.end();
        });
      } else {
        socket.write(
          `HTTP/1.1 200 OK\r\n` +
          `Content-Type: text/plain\r\n` +
          `Content-Length: ${message.length}\r\n\r\n` +
          `${message}`
        );
        socket.end();
      }
    }
    // Handle POST requests to /files/{filename}
    else if (method === 'POST' && requestPath.startsWith('/files/')) {
      const filename = requestPath.slice(7);
      const filePath = path.join(baseDirectory, filename);
      const contentLength = parseInt(headers['content-length'], 10);

      if (isNaN(contentLength)) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.end();
        return;
      }

      const body = Buffer.alloc(contentLength);
      let bytesRead = 0;

      socket.on('data', (chunk) => {
        chunk.copy(body, bytesRead);
        bytesRead += chunk.length;

        if (bytesRead >= contentLength) {
          fs.writeFile(filePath, body, (err) => {
            if (err) {
              socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            } else {
              socket.write('HTTP/1.1 201 Created\r\n\r\n');
            }
            socket.end();
          });
        }
      });
    }
    // Handle GET requests to /files/{filename}
    else if (method === 'GET' && requestPath.startsWith('/files/')) {
      const filename = requestPath.slice(7);
      const filePath = path.join(baseDirectory, filename);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        } else {
          socket.write(
            `HTTP/1.1 200 OK\r\n` +
            `Content-Type: application/octet-stream\r\n` +
            `Content-Length: ${data.length}\r\n\r\n`
          );
          socket.write(data);
        }
        socket.end();
      });
    }
    // Handle unsupported routes
    else {
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
  console.log(`Server running at http://localhost:${PORT}/, serving files from ${baseDirectory}`);
});
