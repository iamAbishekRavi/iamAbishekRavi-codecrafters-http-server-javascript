# iamAbishekRavi-codecrafters-http-server-javascript
⚡ Build Your Own HTTP Server using net Module 🚀
Welcome to a handcrafted HTTP server built from scratch with Node.js’s net module – no shortcuts, just raw TCP power! 💪🔥 This project demonstrates how to build your own web server by handling sockets directly.

🔥 Features
🔄 Handles GET and POST requests

🗂️ Read/write files via /files/{filename}

🗣️ Echo responses with /echo/{string}

📦 Gzip compression support

🧵 Handles concurrent connections

🧾 Custom HTTP response headers & status codes

🚀 Getting Started
bash
Copy
Edit
# Run the server with a custom directory
node server.js --directory path/to/your/files
🧪 Example Requests
bash
Copy
Edit
# Echo with gzip compression
curl -H "Accept-Encoding: gzip" http://localhost:4221/echo/hello

# Save data to a file
curl -X POST http://localhost:4221/files/notes.txt --data 'Hello file!'

# Read data from a file
curl http://localhost:4221/files/notes.txt
🛠 Tech Stack
🟢 Node.js

🧩 Core modules: net, fs, zlib, path

