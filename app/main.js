const http = require('http');// http is used to create the server
const fs = require('fs');// fs is used to write files
const path = require('path');// path is used to join paths
const zlib = require('zlib');// zlib is used to compress the response
const url = require('url');// url is used to parse the request URL

const port = 4221;

// Extract --directory flag
const directoryFlagIndex = process.argv.indexOf('--directory');
const baseDirectory = directoryFlagIndex !== -1 ? process.argv[directoryFlagIndex + 1] : './';

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const pathname = parsedUrl.pathname || '';

  // Handle /echo/{str} with optional gzip
  if (method === 'GET' && pathname.startsWith('/echo/')) {
    const str = pathname.replace('/echo/', '');
    const acceptEncoding = req.headers['accept-encoding'] || '';

    if (acceptEncoding.split(',').map(e => e.trim()).includes('gzip')) {
      const buffer = Buffer.from(str, 'utf-8');
      zlib.gzip(buffer, (err, compressed) => {
        if (err) {
          res.writeHead(500);
          res.end('Compression error');
        } else {
          res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Content-Encoding': 'gzip',
            'Content-Length': compressed.length
          });
          res.end(compressed);
        }
      });
    } else {
      const body = Buffer.from(str, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': body.length
      });
      res.end(body);
    }

  // Handle POST /files/{filename}
  } else if (method === 'POST' && pathname.startsWith('/files/')) {
    const filename = pathname.replace('/files/', '');
    const filePath = path.join(baseDirectory, filename);
    const contentLength = parseInt(req.headers['content-length'], 10);

    let data = Buffer.alloc(0);

    req.on('data', chunk => {
      data = Buffer.concat([data, chunk]);
      if (data.length > contentLength) {
        req.destroy(); // avoid overflow
      }
    });

    req.on('end', () => {
      fs.writeFile(filePath, data, (err) => {
        if (err) {
          res.writeHead(500);
          res.end('Failed to write file');
        } else {
          res.writeHead(201);
          res.end();
        }
      });
    });

  // Default: 404
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
