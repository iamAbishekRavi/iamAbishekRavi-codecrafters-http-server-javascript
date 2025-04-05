const http = require('http');//import http from 'http'; // ES6 import syntax
const fs = require('fs');//import fs from 'fs'; // ES6 import syntax
const path = require('path');//import path from 'path'; // ES6 import syntax
const zlib = require('zlib');
const url = require('url');

const port = 4221;

// Extract directory from command line
const directoryFlagIndex = process.argv.indexOf('--directory');
const baseDirectory = directoryFlagIndex !== -1 ? process.argv[directoryFlagIndex + 1] : './';

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const pathname = parsedUrl.pathname || '';

  // GET /echo/{str}sss
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

  // POST /files/{filename}
    } else if (method === 'POST' && pathname.startsWith('/files/')) {
    const filename = pathname.replace('/files/', '');
    const filePath = path.join(baseDirectory, filename);
    const contentLength = parseInt(req.headers['content-length'], 10);
    let data = Buffer.alloc(0);

    req.on('data', chunk => {
      data = Buffer.concat([data, chunk]); // Concatenate the new chunk to the existing data
      if (data.length > contentLength) {
        req.destroy();
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
 
  // GET /files/{filename}
  } else if (method === 'GET' && pathname.startsWith('/files/')) {
    const filename = pathname.replace('/files/', '');
    const filePath = path.join(baseDirectory, filename);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': data.length
        });
        res.end(data);
       }
     });

   // All else: 404
  } else {
    res.writeHead(404);
    res.end();
   }
 });

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
      });
