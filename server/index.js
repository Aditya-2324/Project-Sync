const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

const users = {
  user: { password: '1234', online: false, socketId: null },
  project: { password: '5678', online: false, socketId: null }
};

let chatHistory = [];

io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('login', ({ username, password }) => {
    if (users[username] && users[username].password === password) {
      currentUser = username;
      users[username].online = true;
      users[username].socketId = socket.id;

      socket.emit('loginSuccess', { username, chatHistory });
      io.emit('updateUsers', getUserStatus());
    } else {
      socket.emit('loginFailed');
    }
  });

  socket.on('typing', () => {
    if (currentUser) socket.broadcast.emit('typing', currentUser);
  });

  socket.on('stopTyping', () => {
    if (currentUser) socket.broadcast.emit('stopTyping', currentUser);
  });

  socket.on('sendMessage', (msg) => {
    const message = {
      sender: currentUser,
      text: msg.text,
      timestamp: Date.now(),
      replyTo: msg.replyTo || null,
      seen: false
    };
    chatHistory.push(message);
    io.emit('newMessage', message);
  });

  socket.on('markSeen', () => {
    chatHistory.forEach((msg) => {
      if (msg.sender !== currentUser) msg.seen = true;
    });
    io.emit('chatHistory', chatHistory);
  });

  socket.on('deleteMessage', (timestamp) => {
    chatHistory = chatHistory.filter(msg => msg.timestamp !== timestamp);
    io.emit('chatHistory', chatHistory);
  });

  socket.on('disconnect', () => {
    if (currentUser && users[currentUser]) {
      users[currentUser].online = false;
      users[currentUser].socketId = null;
      io.emit('updateUsers', getUserStatus());
    }
  });
});

function getUserStatus() {
  return Object.fromEntries(Object.entries(users).map(([user, info]) => [user, info.online]));
}

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
