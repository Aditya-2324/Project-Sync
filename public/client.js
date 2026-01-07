document.addEventListener("DOMContentLoaded", () => {

const socket = io();

let currentUser = null;
let chatHistory = [];
let replyTo = null;

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

window.login = function () {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        loginError.textContent = "Please enter username and password.";
        return;
    }

    socket.emit("login", { username, password });
};

socket.on("loginSuccess", (data) => {
    currentUser = data.username;
    chatHistory = data.chatHistory;

    loginPage.style.display = "none";
    chatPage.style.display = "flex";

    updateChat(chatHistory);
});

socket.on("loginFailed", () => {
    loginError.textContent = "Invalid username or password.";
});

socket.on("updateUsers", (users) => {
    const onlineUsers = Object.keys(users).filter(
        u => users[u] && u !== currentUser
    );

    onlineStatus.textContent = onlineUsers.length
        ? Online: ${onlineUsers.join(", ")}
        : "No other users online.";
});

let typingTimer;

function stopTyping() {
    clearTimeout(typingTimer);
    socket.emit("stopTyping");
    typingStatus.textContent = "";
}

function typing() {
    socket.emit("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, 1000);
}

socket.on("typing", (username) => {
    if (username !== currentUser) {
        typingStatus.textContent = ${username} is typing...;
    }
});

socket.on("stopTyping", () => {
    typingStatus.textContent = "";
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    socket.emit("sendMessage", {
        text,
        replyTo
    });

    messageInput.value = "";
    messageInput.style.height = "auto";
    replyTo = null;
    replyBox.style.display = "none";
    stopTyping();
}

socket.on("newMessage", (msg) => {
    chatHistory.push(msg);
    addMessage(msg);

    setTimeout(() => {
        const last = chatBox.lastElementChild;
        if (last) last.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
});

function updateChat(history) {
    chatBox.innerHTML = "";
    history.forEach(addMessage);

    setTimeout(() => {
        const last = chatBox.lastElementChild;
        if (last) last.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
}

function addMessage(msg) {
    const div = document.createElement("div");
    div.className = msg.sender === currentUser ? "msg right" : "msg left";
    div.dataset.timestamp = msg.timestamp;

    if (msg.replyTo) {
        const rq = document.createElement("div");
        rq.className = "reply-quote";
        rq.innerHTML = Replying to: <span>${msg.replyTo}</span>;
        div.appendChild(rq);
    }

    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = `
        <span class="message-text">${msg.text}</span>
        <small class="message-status">${msg.seen ? "✓✓" : "✓"}</small>
    `;
    div.appendChild(content);

    chatBox.appendChild(div);
}

function startReply(msg) {
    replyTo = msg.text;
    replyText.textContent = msg.text;
    replyBox.style.display = "flex";
    messageInput.focus();
}

cancelReplyBtn.addEventListener("click", () => {
    replyTo = null;
    replyBox.style.display = "none";
});

clearChatBtn.addEventListener("click", () => {
    if (confirm("Clear all chat messages?")) {
        socket.emit("clearChat");
    }
});

socket.on("chatCleared", () => {
    chatHistory = [];
    chatBox.innerHTML = "";
});

messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
    typing();
});

messageInput.addEventListener("blur", stopTyping);

messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
});
