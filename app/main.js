const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const port = 4221;
const baseDirectory = process.argv.includes('--directory')
  ? process.argv[process.argv.indexOf('--directory') + 1]
  : path.join(__dirname, 'app');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  const pathname = url.pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': '0' });
    return res.end();
  }

  // /echo/:text
  if (pathname.startsWith('/echo/')) {
    const message = pathname.replace('/echo/', '');
    const acceptedEncodings = req.headers['accept-encoding'] || '';
    const encodings = acceptedEncodings.split(',').map(e => e.trim().toLowerCase());

    if (encodings.includes('gzip')) {
      const buffer = Buffer.from(message, 'utf-8');
      zlib.gzip(buffer, (err, compressed) => {
        if (err) {
          res.writeHead(500);
          return res.end();
        }
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Content-Encoding': 'gzip',
          'Content-Length': compressed.length
        });
        res.end(compressed);
      });
    } else {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(message)
      });
      res.end(message);
    }
    return;
  }

  // /user-agent
  if (pathname === '/user-agent') {
    const ua = req.headers['user-agent'] || '';
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(ua)
    });
    return res.end(ua);
  }

  // /files/:filename (GET & POST)
  if (pathname.startsWith('/files/')) {
    const filename = pathname.replace('/files/', '');
    const filePath = path.join(baseDirectory, filename);

    if (method === 'GET') {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end();
        }
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': data.length
        });
        res.end(data);
      });
      return;
    }

    if (method === 'POST') {
      const stream = fs.createWriteStream(filePath);
      req.pipe(stream);
      req.on('end', () => {
        res.writeHead(201);
        res.end();
      });
      return;
    }
  }

  // fallback for unknown paths
  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

