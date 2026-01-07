const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;

/**
 * PATH FIX: Your log shows index.js is at /src/server/index.js.
 * To reach the 'public' folder at the root, we must go up two levels.
 */
const publicPath = path.join(__dirname, '..', '..', 'public');
app.use(express.static(publicPath));

// Fallback to ensure index.html is served if the static middleware misses it
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

const saltRounds = 10;
const users = {
    user: { passwordHash: bcrypt.hashSync('1234', saltRounds), online: false, socketId: null },
    project: { passwordHash: bcrypt.hashSync('5678', saltRounds), online: false, socketId: null }
};

let chatHistory = []; 

io.on('connection', (socket) => {
    let currentUser = null; 

    socket.on('login', ({ username, password }) => {  
        if (users[username]) {  
            bcrypt.compare(password, users[username].passwordHash, (err, result) => {  
                if (err) {  
                    socket.emit('loginFailed');  
                    return;  
                }  
                if (result) { 
                    currentUser = username;  
                    users[username].online = true;  
                    users[username].socketId = socket.id; 

                    socket.emit('loginSuccess', { username, chatHistory }); 
                    io.emit('updateUsers', getUserStatus()); 
                    
                    // FIXED: Using backticks for template literals
                    console.log(`${username} logged in.`);  
                } else { 
                    socket.emit('loginFailed');  
                }  
            });  
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
        if (!currentUser || typeof msg.text !== 'string' || !msg.text.trim()) return;  

        const message = {  
            sender: currentUser,  
            text: msg.text.trim(),  
            timestamp: Date.now(), 
            replyTo: msg.replyTo || null, 
            seen: false 
        };  
        chatHistory.push(message);  
        io.emit('newMessage', message); 
    });  

    socket.on('markSeen', (timestamp) => {  
        if (!currentUser) return;  
        let updatedMessages = [];  
        const message = chatHistory.find(msg => msg.timestamp === timestamp && msg.sender !== currentUser);  

        if (message && !message.seen) {  
            message.seen = true;  
            updatedMessages.push({ timestamp: message.timestamp, seen: true });  
        }  

        if (updatedMessages.length > 0) {  
            io.emit('messagesUpdated', updatedMessages);  
        }  
    });  

    socket.on('clearChat', () => {  
        if (!currentUser) return;  
        chatHistory = []; 
        io.emit('chatCleared'); 
    });  

    socket.on('disconnect', () => {  
        if (currentUser && users[currentUser] && users[currentUser].socketId === socket.id) {  
            users[currentUser].online = false;  
            users[currentUser].socketId = null;  
            io.emit('updateUsers', getUserStatus());  
        }  
    });
});

function getUserStatus() {
    const status = {};
    for (const user in users) {
        status[user] = users[user].online;
    }
    return status;
}

http.listen(PORT, () => {
    // FIXED: Using backticks for template literals
    console.log(`Server running on port ${PORT}`); 
});
