// HTTP server using Node.js raw socket approach with path-based routing
const net = require('net');

// Create TCP server
const server = net.createServer((socket) => {
  // Listen for incoming data
  socket.on('data', (data) => {
    // Parse the HTTP request to extract the path
    const request = data.toString();
    
    // Simple regex to extract the path from the request
    const pathMatch = request.match(/GET \/echo\/(.+)HTTP/);
    if (!pathMatch) {
      // Any other path: return 404 Not Found
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      return;
    }

   const responseString = pathMatch[1];
   const requestHEader =  `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${responseString.length}\r\n\r\n`;
   socket.write(requestHEader + responseString);
    // Log the response to the console
    
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