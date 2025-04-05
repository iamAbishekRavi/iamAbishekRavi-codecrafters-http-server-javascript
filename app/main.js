const net = require('net');
const fs = require('fs');
const path = require('path');

const directory = process.argv[2] === '--directory' ? process.argv[3] : __dirname;

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = data.toString();
    const [requestLine, ...headerLines] = request.split('\r\n');
    const [method, requestPath] = requestLine.split(' ');

    if (method === 'POST' && requestPath.startsWith('/files/')) {
      const filename = requestPath.split('/files/')[1];
      const filePath = path.join(directory, filename);

      const headers = {};
      let body = '';
      let isBody = false;

      for (const line of headerLines) {
        if (line === '') {
          isBody = true;
          continue;
        }
        if (isBody) {
          body += line + '\r\n';
        } else {
          const [key, value] = line.split(': ');
          headers[key.toLowerCase()] = value;
        }
      }

      const contentLength = parseInt(headers['content-length'], 10);

      if (body.length >= contentLength) {
        fs.writeFile(filePath, body.slice(0, contentLength), (err) => {
          if (err) {
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
          } else {
            socket.write('HTTP/1.1 201 Created\r\n\r\n');
          }
          socket.end();
        });
      } else {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.end();
      }
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.end();
    }
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

server.listen(4221, () => {
  console.log(`Server running at http://localhost:4221/, serving files from ${directory}`);
})