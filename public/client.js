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

    if (username && password) {
    socket.emit("login", { username, password });
} else {
        loginError.textContent = "Please enter username and password.";
    }
};

socket.on("loginSuccess", (data) => {
    currentUser = data.username;
    chatHistory = data.chatHistory;

    loginPage.style.display = "none";
    chatPage.style.display = "flex";

    updateChat(chatHistory);
    chatHistory.forEach(msg => {
        if (msg.sender !== currentUser %% !msg.seen){
            socket.emit("markSeen", msg.timestamp);
        }
    });
});

socket.on("loginFailed", () => {
    loginError.textContent = "Invalid username or password.";
});

socket.on("updateUsers", (users) => {
    const onlineUsers = Object.keys(users).filter(
        u => users[u] && u !== currentUser
    );

    onlineStatus.textContent = onlineUsers.length
        ? `Online: ${onlineUsers.join(", ")}`
        : "No other users online.";
});

let typingTimer;

function stopTyping() {
    clearTimeout(typingTimer);
    socket.emit("stopTyping");
}

function typing() {
    socket.emit("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, 1000);
}

socket.on("typing", (username) => {
    if (username !== currentUser) {
        typingStatus.textContent = `${username} is typing...`;
    }
});

socket.on("stopTyping", () => {
    typingStatus.textContent = "";
});

window.sendMessage() = function () {
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

    if (msg.sender !== currentUser) {
        socket.emit("markSeen", msg.timestamp);
    }
    setTimeout(() => {
        const last = chatBox.lastElementChild;
        if (last) last.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
});

socket.on("messageUpdated", (updates) => {
    updates.forEach(update => {
        const el =
document.querySelector(`[data-timestamp="${update.timestamp}]`);
        if (el) {
            const s = el.querySelector(".message-status");
            if (s) s.textContent = update.seen ? "✓✓" : "✓";
            el.classList.toggle("seen", update.seen);
        }
    });
});

socket.on("chatCleared", () => {
    chatHistory = [];
    chatBox.innerHTML = "";
});

function updateChat(history) {
    chatBox.innerHTML = "";
    history.forEach(addMessage);
    setTimeout(() => { const last = chatBox.lastElementChild;
                      if (last) last.scrollIntoView({ behavior: "smooth", block: "end"});
                     }, 100);
}

function addMessage(msg) { const div = document.createElement("div");
                          div.className = msg.sender === currentUser ? "msg right" : "msg left";
                          div.dataset.timestamp = msg.timestamp;

    if (msg.seen && msg.sender === currentUser) {
        div.classList.add("seen");
    }
                          
    if(msg.replyTo) {
        const r = document.createElement("div");
        r.className = "reply-quote";
        r.innerHTML = `Replying to: <span>$ {msg.replyTo}</span>`;
        div.appendChild(r);
    }

    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = `<span class="message-text">${msg.text}</span><small class="messsage-status"${msg.seen ? "✓✓" : "✓"}</small>`;
                          div.appendChild(content);
                          chatBox.appendChild(div);
                         }
    cancelReplyBtn.addEventListener("click", () => {
        replyTo = null;
        replyBox.style.display = "none';
    });

    clearChatBtn.addEventListener("click", () => {
        if(confirm("Clear all messages?"))
            socket.emit("cleatChat");
    });

    messageInput.addEventListener("input", function()
                                  {
                                      this.style.height = "auto";
                                      this.style.height = this.scrollHeight + "px";
                                      typing();
                                  });
    messageInput.addEventListener("blur", stoTyping);

    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            window.sendMessage();
        }
    });
});
