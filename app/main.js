// Simple HTTP server using Node.js raw socket approach
const net = require('net');

// Create TCP server
const server = net.createServer((socket) => {
  // Listen for incoming data
  socket.on('data', () => {
    // Send exactly the specified response format
    socket.write('HTTP/1.1 200 OK\r\n\r\n');
    // Close the connection after sending the response
    socket.end();
  });
  
  // Handle connection errors
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// Define port
const port = 3000;

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});