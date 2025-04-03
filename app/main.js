// HTTP server using Node.js raw socket approach with path-based routing
const net = require('net');

// Create TCP server
const server = net.createServer((socket) => {
  // Listen for incoming data
  socket.on('data', (data) => {
    // Parse the HTTP request to extract the path
    const request = data.toString();
    
    // Simple regex to extract the path from the request
    const pathMatch = request.match(/GET\s+(\/[^\s]*)\s+HTTP/);
    const path = pathMatch ? pathMatch[1] : null;
    
    if (path === '/') {
      // Root path: return 200 OK
      socket.write('HTTP/1.1 200 OK\r\n\r\n');
    } else {
      // Any other path: return 404 Not Found
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    }
    
    // Close the connection after sending the response
    socket.end();
  });
  
  // Handle connection errors
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// Use port 4221 as specified by the test
const port = 4221;

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});