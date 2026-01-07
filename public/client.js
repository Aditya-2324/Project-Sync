const socket = io();

let currentUser = null;
let chatHistory = [];
let replyTo = null; 

// DOM Elements
const loginPage = document.getElementById("login-page");
const chatPage = document.getElementById("chat-page");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");
const onlineStatus = document.getElementById("online-status");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const typingStatus = document.getElementById("typing-status");
const replyBox = document.getElementById("reply-box");
const replyText = document.getElementById("reply-text");
const cancelReplyBtn = document.getElementById("cancel-reply");
const clearChatBtn = document.getElementById("clear-chat-btn");

// --- Login Logic ---
function login() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (username && password) {
        socket.emit("login", { username, password });
    } else {
        loginError.textContent = "Please enter username and password.";
    }
}

// Add event listener for login button if you haven't in HTML
// document.getElementById("login-btn").addEventListener("click", login);

socket.on("loginSuccess", (data) => {
    currentUser = data.username;
    chatHistory = data.chatHistory;
    loginPage.style.display = "none";
    chatPage.style.display = "flex";
    updateChat(chatHistory); 

    chatHistory.forEach(msg => {  
        if (msg.sender !== currentUser && !msg.seen) {  
            socket.emit("markSeen", msg.timestamp);  
        }  
    });
});

socket.on("loginFailed", () => {
    loginError.textContent = "Invalid username or password.";
});

// --- User Status Updates ---
socket.on("updateUsers", (users) => {
    let onlineUsers = Object.keys(users).filter(user => users[user] && user !== currentUser);
    // FIXED: Added backticks here
    let statusText = 'Online: ${onlineUsers.join(', ')}';
    if (onlineUsers.length === 0) {
        statusText = "No other users online.";
    }
    onlineStatus.textContent = statusText; 
});

// --- Typing Status ---
let typingTimer;
const typingDelay = 1000; 

function stopTyping() {
    clearTimeout(typingTimer);
    socket.emit("stopTyping");
    if (typingStatus.textContent && typingStatus.textContent.includes(currentUser)) {
        typingStatus.textContent = "";
    }
}

function typing() {
    socket.emit("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        stopTyping();
    }, typingDelay);
}

socket.on("typing", (username) => {
    if (username !== currentUser) {
        // FIXED: Added backticks
        typingStatus.textContent = '${username} is typing...';
    }
});

socket.on("stopTyping", (username) => {
    if (username !== currentUser) {
        typingStatus.textContent = "";
    }
});

// --- Message Handling ---
function sendMessage() {
    const text = messageInput.value.trim();
    if (text) {
        const messageToSend = {
            text: text,
            replyTo: replyTo, 
        };
        socket.emit("sendMessage", messageToSend);
        messageInput.value = ""; 
        messageInput.style.height = "auto"; 
        replyTo = null; 
        replyBox.style.display = "none"; 
        stopTyping(); 
    }
}

socket.on("newMessage", (msg) => {
    chatHistory.push(msg); 
    addMessage(msg); 
    if (msg.sender !== currentUser) { 
        socket.emit("markSeen", msg.timestamp); 
    }
    
    setTimeout(() => {
        const lastMessage = chatBox.lastElementChild;
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, 50); 
});

socket.on('messagesUpdated', (updatedMessages) => {
    updatedMessages.forEach(update => {
        const msgInHistory = chatHistory.find(msg => msg.timestamp === update.timestamp);
        if (msgInHistory) {
            msgInHistory.seen = update.seen;
        }

        const msgDiv = document.querySelector([data-timestamp="${update.timestamp}"]);  
        if (msgDiv) {  
            const smallTag = msgDiv.querySelector('.message-status'); 
            if (smallTag) {  
                smallTag.textContent = update.seen ? "✓✓" : "✓";  
                if (update.seen) {  
                    msgDiv.classList.add('seen'); 
                } else {  
                    msgDiv.classList.remove('seen');  
                }  
            }  
        }  
    });
});

socket.on('chatCleared', () => {
    chatHistory = []; 
    chatBox.innerHTML = ""; 
    typingStatus.textContent = "Chat history cleared.";
    setTimeout(() => typingStatus.textContent = "", 3000);
});

function updateChat(history) {
    chatBox.innerHTML = ""; 
    history.forEach(addMessage); 
    setTimeout(() => {
        const lastMessage = chatBox.lastElementChild;
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, 100); 
}

function addMessage(msg) {
    const msgDiv = document.createElement("div");
    msgDiv.className = msg.sender === currentUser ? "msg right" : "msg left";
    msgDiv.setAttribute("data-timestamp", msg.timestamp); 

    if (msg.seen && msg.sender === currentUser) {  
        msgDiv.classList.add('seen');  
    }  

    if (msg.replyTo) {  
        const replyQuoteDiv = document.createElement("div");  
        replyQuoteDiv.className = "reply-quote";  
        // FIXED: Added backticks
        replyQuoteDiv.innerHTML = Replying to: <span>${msg.replyTo}</span>;  
        msgDiv.appendChild(replyQuoteDiv);  
    }  

    const textContentDiv = document.createElement("div");  
    textContentDiv.className = "message-content"; 
    // FIXED: Added backticks
    textContentDiv.innerHTML = `  
        <span class="message-text">${msg.text}</span>  
        <small class="message-status">${msg.seen ? "✓✓" : "✓"}</small>  
    `;  
    msgDiv.appendChild(textContentDiv);  

    // --- Interaction Logic (Touch/Mouse) ---
    let startX = 0;  
    let isSwiping = false;  
    const swipeThreshold = 50; 

    msgDiv.addEventListener('touchstart', (e) => {  
        startX = e.touches[0].clientX;  
        isSwiping = false;  
        msgDiv.style.transition = ''; 
    }, { passive: true });  

    msgDiv.addEventListener('touchmove', (e) => {  
        const currentX = e.touches[0].clientX;  
        const deltaX = currentX - startX;  
        if (Math.abs(deltaX) > 10) { 
            isSwiping = true;  
            let clampedDeltaX = msg.sender === currentUser ? Math.max(-60, Math.min(0, deltaX)) : Math.min(Math.max(0, deltaX), 60);
            msgDiv.style.transform = translateX(${clampedDeltaX}px);  
        }  
    }, { passive: true });  

    msgDiv.addEventListener('touchend', () => {  
        msgDiv.style.transition = 'transform 0.2s ease-out'; 
        if (isSwiping) {  
            const transformValue = new WebKitCSSMatrix(window.getComputedStyle(msgDiv).transform).m41;
            if (Math.abs(transformValue) >= swipeThreshold) {  
                startReply(msg);  
            }  
            msgDiv.style.transform = translateX(0px);  
        }  
    });  

    chatBox.appendChild(msgDiv);  
}

function startReply(msg) {
    replyTo = msg.text; 
    replyText.textContent = msg.text;
    replyBox.style.display = "flex"; 
    messageInput.focus(); 
}

cancelReplyBtn.addEventListener("click", () => {
    replyTo = null;
    replyText.textContent = "";
    replyBox.style.display = "none";
});

clearChatBtn.addEventListener("click", () => {
    if (confirm("Are you sure?")) {
        socket.emit("clearChat");
    }
});

messageInput.addEventListener("input", function() {
    this.style.height = 'auto'; 
    this.style.height = (this.scrollHeight) + 'px'; 
    typing(); 
});

messageInput.addEventListener("blur", stopTyping);

messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { 
        e.preventDefault(); 
        sendMessage();
    }
});
