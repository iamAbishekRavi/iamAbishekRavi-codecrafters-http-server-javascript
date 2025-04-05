const http = require('http');//Importing the http module to create an HTTP server
const zlib = require('zlib');//Importing the zlib module for compression
const url = require('url');//Importing the url module to parse the URL of incoming requests

const port = 4221;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  if (req.method === 'GET' && path.startsWith('/echo/')) {
    const str = path.replace('/echo/', '');
    const acceptEncoding = req.headers['accept-encoding'] || '';

    if (acceptEncoding.split(',').map(enc => enc.trim()).includes('gzip')) {
      const buffer = Buffer.from(str, 'utf-8');
      zlib.gzip(buffer, (err, compressed) => {
        if (err) {
          res.writeHead(500);
          res.end('Compression error');
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Content-Encoding': 'gzip',
          'Content-Length': compressed.length
        });
        res.end(compressed);
      });
    } else {
      const body = Buffer.from(str, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': body.length
      });
      res.end(body);
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
