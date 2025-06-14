const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const path = require('path');

const users = {
  user: 'pass123',
  project: 'pass456'
};

let messages = [];
let onlineUsers = {};

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] === password) {
    return res.status(200).json({ success: true });
  }
  return res.status(401).json({ success: false });
});

app.get('/messages', (req, res) => {
  res.json(messages);
});

app.post('/delete-all', (req, res) => {
  messages = [];
  io.emit('cleared');
  res.sendStatus(200);
});

io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('join', (username) => {
    currentUser = username;
    onlineUsers[username] = true;
    io.emit('online-users', onlineUsers);
  });

  socket.on('message', (msg) => {
    messages.push(msg);
    io.emit('message', msg);
  });

  socket.on('typing', ({ from, isTyping }) => {
    socket.broadcast.emit('typing', { from, isTyping });
  });

  socket.on('seen', (msgId) => {
    messages = messages.map(m => m.id === msgId ? { ...m, seen: true } : m);
    io.emit('seen', msgId);
  });

  socket.on('disconnect', () => {
    if (currentUser) {
      delete onlineUsers[currentUser];
      io.emit('online-users', onlineUsers);
    }
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
