const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;

// Correct static file path for the 'public' folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// IMPORTANT: In a real production app, these hashes would be generated securely (e.g., during registration)
// and stored in a database, NOT hardcoded. This is for demonstration of hashing.
const saltRounds = 10;
const users = {
    user: { passwordHash: bcrypt.hashSync('1234', saltRounds), online: false, socketId: null },
    project: { passwordHash: bcrypt.hashSync('5678', saltRounds), online: false, socketId: null }
};

let chatHistory = []; // In-memory chat history (ephemeral)

io.on('connection', (socket) => {
    let currentUser = null; // Track the logged-in user for this specific socket connection

    socket.on('login', ({ username, password }) => {
        if (users[username]) {
            bcrypt.compare(password, users[username].passwordHash, (err, result) => {
                if (err) {
                    console.error("Bcrypt comparison error:", err);
                    socket.emit('loginFailed');
                    return;
                }
                if (result) { // Passwords match
                    if (users[username].online && users[username].socketId && users[username].socketId !== socket.id) {
                        console.log(`${username} re-logged in from a new session, disconnecting old one if active.`);
                        // Optional: Disconnect previous session if you want only one active session per user
                        // const oldSocket = io.sockets.sockets.get(users[username].socketId);
                        // if (oldSocket) {
                        //     oldSocket.emit('forceLogout', 'You logged in from another device.');
                        //     oldSocket.disconnect(true);
                        // }
                    }

                    currentUser = username;
                    users[username].online = true;
                    users[username].socketId = socket.id; // Store current socket ID for this user

                    socket.emit('loginSuccess', { username, chatHistory }); // Send current history
                    io.emit('updateUsers', getUserStatus()); // Inform all clients about user status changes
                    console.log(`${username} logged in. Socket ID: ${socket.id}`);
                } else { // Passwords don't match
                    socket.emit('loginFailed');
                    console.log(`Login failed for ${username}: Invalid password.`);
                }
            });
        } else { // User not found
            socket.emit('loginFailed');
            console.log(`Login failed: User ${username} not found.`);
        }
    });

    socket.on('typing', () => {
        if (currentUser) socket.broadcast.emit('typing', currentUser);
    });

    socket.on('stopTyping', () => {
        if (currentUser) socket.broadcast.emit('stopTyping', currentUser);
    });

    socket.on('sendMessage', (msg) => {
        if (!currentUser || typeof msg.text !== 'string' || !msg.text.trim()) {
            console.warn(`Invalid message attempt by ${currentUser || 'unknown'}:`, msg);
            return; // Basic validation
        }

        const message = {
            sender: currentUser,
            text: msg.text.trim(),
            timestamp: Date.now(), // Unique ID for the message
            replyTo: msg.replyTo || null, // Ensure replyTo is null if not provided
            seen: false // Will be marked seen by recipient
        };
        chatHistory.push(message);

        console.log(`Message from ${message.sender}: "${message.text}" (Reply to: ${message.replyTo})`);
        io.emit('newMessage', message); // Emit new message to all connected clients
    });

    socket.on('markSeen', (timestamp) => {
        if (!currentUser) return;

        let updatedMessages = [];
        const message = chatHistory.find(msg => msg.timestamp === timestamp && msg.sender !== currentUser);

        if (message && !message.seen) {
            message.seen = true;
            updatedMessages.push({ timestamp: message.timestamp, seen: true });
            console.log(`Message ${timestamp} from ${message.sender} marked as seen by ${currentUser}.`);
        }

        if (updatedMessages.length > 0) {
            io.emit('messagesUpdated', updatedMessages);
        }
    });

    // NEW: Clear Chat Event Handler
    socket.on('clearChat', () => {
        if (!currentUser) {
            console.warn("Attempt to clear chat by unauthenticated user.");
            return;
        }
        console.log(`${currentUser} cleared the chat history.`);
        chatHistory = []; // Clear the entire chat history
        io.emit('chatCleared'); // Inform all clients that the chat has been cleared
    });

    // Removed 'deleteMessage' handler as it's replaced by 'clearChat'

    socket.on('disconnect', () => {
        if (currentUser && users[currentUser] && users[currentUser].socketId === socket.id) {
            users[currentUser].online = false;
            users[currentUser].socketId = null;
            io.emit('updateUsers', getUserStatus());
            console.log(`${currentUser} disconnected. Socket ID: ${socket.id}`);
        } else if (currentUser) {
             console.log(`${currentUser} disconnected from a non-primary session (or socketId mismatch).`);
        } else {
             console.log("An unknown user disconnected.");
        }
    });
});

// Helper function to get online status for all registered users
function getUserStatus() {
    const status = {};
    for (const user in users) {
        status[user] = users[user].online;
    }
    return status;
}

http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
