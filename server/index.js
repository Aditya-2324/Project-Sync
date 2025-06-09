const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const path = require('path');

const PORT = process.env.PORT || 3000;
const VALID_USERS = {
  player 1: '230824',
  player 2: '240823',
};

let messages = [];
let onlineUsers = {};

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
  socket.on('login', ({ username, password }) => {
    if (VALID_USERS[username] === password) {
      socket.username = username;
      onlineUsers[username] = true;
      socket.emit('loginSuccess', { username, messages });
      io.emit('userStatus', onlineUsers);
    } else {
      socket.emit('loginFailure');
    }
  });

  socket.on('sendMessage', (msg) => {
    const message = { user: socket.username, text: msg, time: Date.now() };
    messages.push(message);
    io.emit('message', message);
  });

  socket.on('deleteAll', () => {
    messages = [];
    io.emit('messageDeleted');
  });

  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('typing', { user: socket.username, isTyping });
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      io.emit('userStatus', onlineUsers);
    }
  });
});

// Purge old messages every hour
setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000; // 6 hours
  messages = messages.filter(m => m.time > cutoff);
}, 60 * 60 * 1000);

server.listen(PORT, () => console.log(`Server running on ${PORT}`));

});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
