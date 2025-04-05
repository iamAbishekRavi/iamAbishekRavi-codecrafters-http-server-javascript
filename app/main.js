const net = require('net');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const server = net.createServer((socket) => {
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    const requestStr = buffer.toString();
    const headerEnd = requestStr.indexOf('\r\n\r\n');
    if (headerEnd === -1) return; // Wait for full headers

    const headersPart = requestStr.slice(0, headerEnd);
    const bodyStart = headerEnd + 4;
    const requestLines = headersPart.split('\r\n');
    const [requestLine, ...headerLines] = requestLines;
    const [method, requestPath, _httpVersion] = requestLine.split(' ');

    const headers = {};
    for (const line of headerLines) {
      const [key, value] = line.split(': ');
      if (key && value) {
        headers[key.toLowerCase()] = value;
      }
    }

    const contentLength = parseInt(headers['content-length'] || '0', 10);
    const fullRequestLength = bodyStart + contentLength;

    if (buffer.length < fullRequestLength) return; // Wait for full body
    const body = buffer.slice(bodyStart, fullRequestLength);

    const directory = process.argv.includes('--directory')
      ? process.argv[process.argv.indexOf('--directory') + 1]
      : __dirname;

    // -----------------------------
    // Handle GET /echo/{text}
    // -----------------------------
    if (method === 'GET' && requestPath.startsWith('/echo/')) {
      const textToEcho = requestPath.slice(6);
      const acceptEncoding = headers['accept-encoding'] || '';

      if (acceptEncoding.includes('gzip')) {
        const gzipped = zlib.gzipSync(textToEcho);
        socket.write('HTTP/1.1 200 OK\r\n');
        socket.write('Content-Encoding: gzip\r\n');
        socket.write(`Content-Length: ${gzipped.length}\r\n`);
        socket.write('\r\n');
        socket.write(gzipped);
      } else {
        socket.write('HTTP/1.1 200 OK\r\n');
        socket.write(`Content-Length: ${Buffer.byteLength(textToEcho)}\r\n`);
        socket.write('\r\n');
        socket.write(textToEcho);
      }
      socket.end();
      return;
    }

    // -----------------------------
    // Handle GET /files/{filename}
    // -----------------------------
    if (method === 'GET' && requestPath.startsWith('/files/')) {
      const filename = requestPath.slice(7);
      const filePath = path.join(directory, filename);

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
    // Handle POST /files/{filename}
    // -----------------------------
    if (method === 'POST' && requestPath.startsWith('/files/')) {
      const filename = requestPath.slice(7);
      const filePath = path.join(directory, filename);

      fs.writeFile(filePath, body, (err) => {
        if (err) {
          socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        } else {
          socket.write('HTTP/1.1 201 Created\r\n\r\n');
        }
        socket.end();
      });
      return;
    }

    // -----------------------------
    // Fallback 404 for everything else
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
  const directory = process.argv.includes('--directory')
    ? process.argv[process.argv.indexOf('--directory') + 1]
    : __dirname;

  console.log(`Server running at http://localhost:${PORT}/, serving files from ${directory}`);
});
