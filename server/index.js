const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT||3000;

app.use(express.static(path.join(__dirname,'../public')));

const users = {
  user: { password:'1234', online:false },
  project: { password:'5678', online:false }
};
let chatHistory=[];

io.on('connection', socket=>{
  let currentUser = null;

  socket.on('login', data=>{
    const u=users[data.username];
    if(u && data.password===u.password){
      currentUser = data.username;
      u.online = true;
      socket.emit('loginSuccess',{username:currentUser, chatHistory});
      io.emit('updateUsers', Object.keys(users).filter(k=>users[k].online));
    }else socket.emit('loginFailed');
  });

  socket.on('sendMessage', data=>{
    const msg = { sender: currentUser, text: data.text, replyTo: data.replyTo, timestamp: Date.now() };
    chatHistory.push(msg);
    io.emit('newMessage', msg);
  });

  socket.on('deleteChat', ()=>{
    chatHistory=[];
    io.emit('chatDeleted');
  });

  socket.on('typing', ()=>socket.broadcast.emit('typing', currentUser));
  socket.on('stopTyping', ()=>socket.broadcast.emit('stopTyping'));

  socket.on('disconnect', ()=>{
    if(currentUser){
      users[currentUser].online=false;
      io.emit('updateUsers', Object.keys(users).filter(k=>users[k].online));
    }
  });
});

server.listen(PORT, ()=>console.log(`Server running on ${PORT}`));

