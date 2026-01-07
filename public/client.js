const socket = io();
let currentUser = "";
let replyingTo = null;

// --- LOGIN LOGIC ---
function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (u && p) {
        socket.emit('login', { username: u, password: p });
    }
}

socket.on('loginSuccess', (data) => {
    currentUser = data.username;
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('chat-page').style.display = 'flex';
    
    // Load existing history
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = "";
    data.chatHistory.forEach(addMessageToUI);
    scrollToBottom();
});

socket.on('loginFailed', () => {
    document.getElementById('login-error').innerText = "Invalid Username or Password";
});

// --- MESSAGE SENDING ---
function sendMessage() {
    const input = document.getElementById('message');
    const text = input.value.trim();
    
    if (text) {
        socket.emit('sendMessage', { 
            text: text,
            replyTo: replyingTo 
        });
        input.value = "";
        cancelReply(); // Clear reply state after sending
    }
}

socket.on('newMessage', (msg) => {
    addMessageToUI(msg);
    if (msg.sender !== currentUser) {
        socket.emit('markSeen', msg.timestamp);
    }
});

// --- UI HELPERS ---
function addMessageToUI(msg) {
    const chatBox = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.classList.add('msg', msg.sender === currentUser ? 'right' : 'left');
    if (msg.seen) div.classList.add('seen');

    let replyHtml = msg.replyTo ? <div class="reply-quote"><span>Replying to:</span> ${msg.replyTo}</div> : "";
    
    div.innerHTML = `
        ${replyHtml}
        <div class="message-content">
            <span class="message-text">${msg.text}</span>
            <span class="message-status">${msg.seen ? '✓✓' : '✓'}</span>
        </div>
    `;
    
    chatBox.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const chatBox = document.getElementById('chat-box');
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- TYPING STATUS ---
const messageInput = document.getElementById('message');
messageInput.addEventListener('input', () => {
    socket.emit('typing');
    // Clear typing status after 2 seconds of no input
    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => {
        socket.emit('stopTyping');
    }, 2000);
});

socket.on('typing', (user) => {
    document.getElementById('online-status').innerText = ${user} is typing...;
});

socket.on('stopTyping', () => {
    updateOnlineStatus(); // Reset to normal status
});

// --- USER STATUS & UPDATES ---
let currentOnlineStatus = {};
socket.on('updateUsers', (status) => {
    currentOnlineStatus = status;
    updateOnlineStatus();
});

function updateOnlineStatus() {
    const onlineUsers = Object.keys(currentOnlineStatus).filter(u => currentOnlineStatus[u]);
    document.getElementById('online-status').innerText = Online: ${onlineUsers.join(', ')};
}

// --- CLEAR CHAT ---
document.getElementById('clear-chat-btn').addEventListener('click', () => {
    if(confirm("Clear all messages for everyone?")) {
        socket.emit('clearChat');
    }
});

socket.on('chatCleared', () => {
    document.getElementById('chat-box').innerHTML = "";
});

// --- REPLY LOGIC ---
function cancelReply() {
    replyingTo = null;
    // Hide reply UI if you have one
}
