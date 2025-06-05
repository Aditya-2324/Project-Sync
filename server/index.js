const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// === Hardcoded users (username:password) ===
const users = {
  SAP: "230824",
  PSA: "240823"
};

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "../public")));

// Simple login API (POST /login)
app.use(express.json());
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Invalid credentials" });
  }
});

// In-memory messages array
let messages = [];

// Auto-purge messages older than 6 hours
const PURGE_INTERVAL_MS = 1000 * 60 * 10; // every 10 minutes
const MESSAGE_LIFETIME_MS = 1000 * 60 * 60 * 6; // 6 hours

function purgeOldMessages() {
  const now = Date.now();
  messages = messages.filter(msg => now - msg.timestamp < MESSAGE_LIFETIME_MS);
  io.emit("purged");
}

setInterval(purgeOldMessages, PURGE_INTERVAL_MS);

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  // Send current messages to new client
  socket.emit("load-messages", messages);

  socket.on("send-message", (msg) => {
    if (typeof msg.text === "string" && msg.text.trim() !== "") {
      const message = {
        id: Date.now() + Math.random(),
        username: msg.username,
        text: msg.text,
        timestamp: Date.now()
      };
      messages.push(message);
      io.emit("new-message", message);
    }
  });

  socket.on("delete-chat", () => {
    messages = [];
    io.emit("purged");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
