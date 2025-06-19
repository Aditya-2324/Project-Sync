const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const bcrypt = require('bcryptjs'); // <<< ADD THIS LINE for password hashing

const PORT = process.env.PORT || 3000;

// Correct static file path for the 'public' folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// IMPORTANT: HASH YOUR PASSWORDS (Example using bcryptjs)
// In a real app, you'd generate these hashes securely,
// not put them directly in code like this. This is for demonstration.
const saltRounds = 10;
const users = {
    user: { passwordHash: bcrypt.hashSync('1234', saltRounds), online: false, socketId: null },
    project: { passwordHash: bcrypt.hashSync('5678', saltRounds), online: false, socketId: null }
};


let chatHistory = []; // In-memory chat history

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('login', ({ username, password }) => {
        if (users[username]) {
            // Compare the provided password with the stored hash
            bcrypt.compare(password, users[username].passwordHash, (err, result) => {
                if (err) {
                    console.error("Bcrypt comparison error:", err);
                    socket.emit('loginFailed');
                    return;
                }
                if (result) { // Passwords match
                    // Prevent multiple logins for the same user if they are already logged in elsewhere
                    if (users[username].online) {
                        // Optional: Disconnect the old socket if a new login occurs
                        // if (users[username].socketId && io.sockets.sockets.get(users[username].socketId)) {
                        //     io.sockets.sockets.get(users[username].socketId).disconnect(true);
                        // }
                        // Or simply deny the new login attempt with a specific message
                        // socket.emit('loginFailed', 'User already logged in elsewhere.');
                        // return;
                        // For a 1:1 chat with only two users, let's allow re-login and update socketId
                        console.log(`${username} re-logged in.`);
                    }

                    currentUser = username;
                    users[username].online = true;
                    users[username].socketId = socket.id;

                    socket.emit('loginSuccess', { username, chatHistory });
                    io.emit('updateUsers', getUserStatus());
                } else { // Passwords don't match
                    socket.emit('loginFailed');
                }
            });
        } else { // User not found
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
        if (!currentUser || !msg.text.trim()) return; // Basic validation

        const message = {
            sender: currentUser,
            text: msg.text.trim(),
            timestamp: Date.now(),
            replyTo: msg.replyTo || null,
            seen: false // Will be marked seen by recipient
        };
        chatHistory.push(message);

        // Optional: Implement the fixed-size history if memory becomes a concern
        // const MAX_HISTORY_MESSAGES = 100; // Example
        // if (chatHistory.length > MAX_HISTORY_MESSAGES) {
        //     chatHistory.shift(); // Remove oldest message
        // }

        io.emit('newMessage', message); // Emit new message to all connected clients
    });

    // Modified markSeen to be more efficient
    socket.on('markSeen', () => {
        let updatedMessages = [];
        chatHistory.forEach((msg) => {
            if (msg.sender !== currentUser && !msg.seen) {
                msg.seen = true;
                updatedMessages.push({ timestamp: msg.timestamp, seen: true });
            }
        });
        if (updatedMessages.length > 0) {
            // Emit a specific event for updates, not the whole history
            io.emit('messagesUpdated', updatedMessages);
        }
    });

    // Modified deleteMessage for security and efficiency
    socket.on('deleteMessage', (timestamp) => {
        if (!currentUser) return; // Must be logged in to delete

        const initialLength = chatHistory.length;
        // Filter out the message, ensuring only the sender can delete their own message
        chatHistory = chatHistory.filter(msg => !(msg.timestamp === timestamp && msg.sender === currentUser));

        if (chatHistory.length < initialLength) { // A message was actually deleted
            io.emit('messageDeleted', timestamp); // Tell clients which message to remove
        } else {
            console.warn(`Deletion attempt for timestamp ${timestamp} failed by ${currentUser}. Either not found or not owned.`);
        }
    });


    socket.on('disconnect', () => {
        if (currentUser && users[currentUser]) {
            // Only set offline if this socket was the active one for the user
            if (users[currentUser].socketId === socket.id) {
                users[currentUser].online = false;
                users[currentUser].socketId = null;
                console.log(`${currentUser} disconnected.`);
                io.emit('updateUsers', getUserStatus());
            } else {
                 console.log(`${currentUser} disconnected, but another session might be active.`);
            }
        }
    });
});

function getUserStatus() {
    return Object.fromEntries(Object.entries(users).map(([user, info]) => [user, info.online]));
}

http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
