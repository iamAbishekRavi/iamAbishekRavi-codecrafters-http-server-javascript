// Basic HTTP server using `net` module with gzip, file handling, and concurrency

const net = require('net');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 4221;
const HOST = 'localhost';
const ROOT_DIR = process.argv.includes('--directory')
  ? process.argv[process.argv.indexOf('--directory') + 1]
  : './';

const server = net.createServer();

server.on('connection', (socket) => {
  let buffer = '';

  socket.on('data', (chunk) => {
    buffer += chunk.toString();

    const headerEndIndex = buffer.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) return; // Wait for full headers

    const headerPart = buffer.slice(0, headerEndIndex);
    const [firstLine, ...rawHeaders] = headerPart.split('\r\n');
    const [method, urlPath, version] = firstLine.split(' ');

    const headers = {};
    rawHeaders.forEach((line) => {
      const [key, value] = line.split(':').map(v => v.trim());
      headers[key.toLowerCase()] = value;
    });

    const contentLength = parseInt(headers['content-length'] || '0');
    const bodyStart = headerEndIndex + 4;
    const totalLength = bodyStart + contentLength;
    if (buffer.length < totalLength) return; // Wait for full body

    const body = buffer.slice(bodyStart, totalLength);
    handleRequest({ method, urlPath, version, headers, body }, socket);
  });

  socket.on('error', () => {});
});

function handleRequest(req, socket) {
  const { method, urlPath, version, headers, body } = req;
  let responseBody = '';
  let statusCode = 200;
  const responseHeaders = {
    'Content-Type': 'text/plain'
  };

  if (urlPath === '/') {
    responseBody = 'OK';
  } else if (urlPath.startsWith('/echo/')) {
    let str = urlPath.slice('/echo/'.length);
    const acceptsGzip = headers['accept-encoding']?.split(',').map(e => e.trim()).includes('gzip');
    if (acceptsGzip) {
      const gzipped = zlib.gzipSync(str);
      responseHeaders['Content-Encoding'] = 'gzip';
      responseHeaders['Content-Length'] = gzipped.length;
      return sendResponse(socket, version, 200, responseHeaders, gzipped);
    } else {
      responseBody = str;
    }
  } else if (urlPath === '/user-agent') {
    responseBody = headers['user-agent'] || '';
  } else if (urlPath.startsWith('/files/')) {
    const filePath = path.join(ROOT_DIR, urlPath.replace('/files/', ''));
    if (method === 'GET') {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        responseBody = content;
        responseHeaders['Content-Type'] = 'application/octet-stream';
        responseHeaders['Content-Length'] = content.length;
      } else {
        return sendResponse(socket, version, 404, responseHeaders, '');
      }
    } else if (method === 'POST') {
      fs.writeFileSync(filePath, body);
      return sendResponse(socket, version, 201, responseHeaders, '');
    } else {
      return sendResponse(socket, version, 405, responseHeaders, '');
    }
  } else {
    statusCode = 404;
    responseBody = '';
  }

  if (!responseHeaders['Content-Length']) {
    responseHeaders['Content-Length'] = Buffer.byteLength(responseBody);
  }
  sendResponse(socket, version, statusCode, responseHeaders, responseBody);
}

function sendResponse(socket, version, status, headers, body) {
  let res = `${version} ${status} ${getStatusMessage(status)}\r\n`;
  for (const [key, val] of Object.entries(headers)) {
    res += `${key}: ${val}\r\n`;
  }
  res += '\r\n';
  socket.write(res);
  if (Buffer.isBuffer(body)) {
    socket.write(body);
  } else {
    socket.write(body.toString());
  }
  socket.end();
}

function getStatusMessage(code) {
  const messages = {
    200: 'OK',
    201: 'Created',
    404: 'Not Found',
    405: 'Method Not Allowed'
  };
  return messages[code] || 'OK';
}

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
