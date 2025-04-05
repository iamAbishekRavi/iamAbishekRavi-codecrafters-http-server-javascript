const net = require('net');
const zlib = require('zlib');

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = data.toString();
    const [requestLine, ...headers] = request.split('\r\n');
    const [method, path] = requestLine.split(' ');

    if (method === 'GET' && path.startsWith('/echo/')) {
      const responseText = path.slice(6);
      const acceptEncodingHeader = headers.find((header) =>
        header.toLowerCase().startsWith('accept-encoding:')
      );
      const acceptEncoding = acceptEncodingHeader
        ? acceptEncodingHeader.split(':')[1].trim()
        : '';

      if (acceptEncoding.includes('gzip')) {
        zlib.gzip(responseText, (err, compressedData) => {
          if (err) {
            console.error('Compression error:', err);
            socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            return;
          }
          socket.write(
            `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Encoding: gzip\r\nContent-Length: ${compressedData.length}\r\n\r\n`
          );
          socket.write(compressedData);
          socket.end();
        });
      } else {
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${responseText.length}\r\n\r\n${responseText}`
        );
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
  console.log('Server running at http://localhost:4221/');
});
