const net = require('net');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const directoryArgIndex = process.argv.indexOf('--directory');
const baseDirectory = directoryArgIndex !== -1 ? process.argv[directoryArgIndex + 1] : __dirname;

const server = net.createServer((socket) => {
  let fullData = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    fullData = Buffer.concat([fullData, chunk]);
    const requestString = fullData.toString();

    if (!requestString.includes('\r\n\r\n')) return;

    const [headerPart, bodyPart] = requestString.split('\r\n\r\n');
    const headers = headerPart.split('\r\n');
    const [requestLine, ...headerLines] = headers;
    const [method, requestPath] = requestLine.split(' ');

    const headerMap = {};
    headerLines.forEach(line => {
      const [key, value] = line.split(': ');
      if (key && value) {
        headerMap[key.toLowerCase()] = value;
      }
    });

    const contentLength = parseInt(headerMap['content-length'] || '0', 10);
    const acceptEncoding = headerMap['accept-encoding'] || '';

    // -----------------------------
    // Handle GET /
    // -----------------------------
    if (method === 'GET' && requestPath === '/') {
      const body = 'Hello World';
      socket.write('HTTP/1.1 200 OK\r\n');
      socket.write(`Content-Length: ${Buffer.byteLength(body)}\r\n`);
      socket.write('\r\n');
      socket.write(body);
      socket.end();
      return;
    }

    // -----------------------------
    // Handle GET /echo/:text
    // -----------------------------
    if (method === 'GET' && requestPath.startsWith('/echo/')) {
      const echoText = requestPath.slice(6);
      const buffer = Buffer.from(echoText);

      if (acceptEncoding.includes('gzip')) {
        zlib.gzip(buffer, (err, compressed) => {
          if (err) {
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.end();
          } else {
            socket.write('HTTP/1.1 200 OK\r\n');
            socket.write('Content-Encoding: gzip\r\n');
            socket.write(`Content-Length: ${compressed.length}\r\n`);
            socket.write('\r\n');
            socket.write(compressed);
            socket.end();
          }
        });
        return;
      } else {
        socket.write('HTTP/1.1 200 OK\r\n');
        socket.write(`Content-Length: ${buffer.length}\r\n`);
        socket.write('\r\n');
        socket.write(buffer);
        socket.end();
        return;
      }
    }

    // -----------------------------
    // Handle GET /files/:filename
    // -----------------------------
    if (method === 'GET' && requestPath.startsWith('/files/')) {
      const filename = requestPath.slice(7);
      const filePath = path.join(baseDirectory, filename);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        } else {
          socket.write('HTTP/1.1 200 OK\r\n');
          socket.write('Content-Type: application/octet-stream\r\n');
          socket.write(`Content-Length: ${data.length}\r\n`);
          socket.write('\r\n');
          socket.write(data);
        }
        socket.end();
      });
      return;
    }

    // -----------------------------
    // Handle POST /files/:filename
    // -----------------------------
    if (method === 'POST' && requestPath.startsWith('/files/')) {
      const filename = requestPath.slice(7);
      const filePath = path.join(baseDirectory, filename);
      const bodyBuffer = fullData.slice(fullData.indexOf('\r\n\r\n') + 4);

      if (bodyBuffer.length < contentLength) {
        let remainingData = Buffer.alloc(0);

        socket.on('data', (moreChunk) => {
          remainingData = Buffer.concat([remainingData, moreChunk]);
          if (remainingData.length >= contentLength - bodyBuffer.length) {
            const fullBody = Buffer.concat([bodyBuffer, remainingData]);

            fs.writeFile(filePath, fullBody, (err) => {
              if (err) {
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
              } else {
                socket.write('HTTP/1.1 201 Created\r\n\r\n');
              }
              socket.end();
            });
          }
        });
      } else {
        fs.writeFile(filePath, bodyBuffer, (err) => {
          if (err) {
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
          } else {
            socket.write('HTTP/1.1 201 Created\r\n\r\n');
          }
          socket.end();
        });
      }
      return;
    }

    // -----------------------------
    // Fallback 404
    // -----------------------------
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.end();
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

const PORT = 4221;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/, serving files from ${baseDirectory}`);
});
