const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "..", "public")));

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("user-connected", (user) => {
    socket.username = user;
  });

  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
    setTimeout(() => {
      socket.broadcast.emit("typing", "");
    }, 1000);
  });

  socket.on("message", (msg) => {
    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
