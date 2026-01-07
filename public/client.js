const socket = io();

let currentUser = "";

// ---------- LOGIN ----------
function login() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();
    if (u && p) {
        socket.emit("login", { username: u, password: p });
    }
}

socket.on("loginSuccess", (data) => {
    currentUser = data.username;

    document.getElementById("login-page").style.display = "none";
    document.getElementById("chat-page").style.display = "flex";

    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = "";

    data.chatHistory.forEach(addMessageToUI);
    forceScrollBottom();
});

socket.on("loginFailed", () => {
    document.getElementById("login-error").innerText = "Invalid username or password";
});

// ---------- SEND MESSAGE ----------
function sendMessage() {
    const input = document.getElementById("message");
    const text = input.value.trim();
    if (!text) return;

    socket.emit("sendMessage", { text });
    input.value = "";
}

socket.on("newMessage", (msg) => {
    addMessageToUI(msg);
});

// ---------- UI ----------
function addMessageToUI(msg) {
    const chatBox = document.getElementById("chat-box");

    const div = document.createElement("div");
    div.className = "msg " + (msg.sender === currentUser ? "right" : "left");

    div.innerHTML = `
        <div class="message-content">
            <span class="message-text">${msg.text}</span>
        </div>
    `;

    chatBox.appendChild(div);
    forceScrollBottom();
}

// ---------- SCROLL FIX (IMPORTANT) ----------
function forceScrollBottom() {
    const chatBox = document.getElementById("chat-box");

    // Allow browser to render first
    requestAnimationFrame(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// ---------- ENTER TO SEND ----------
document.getElementById("message").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Make login & sendMessage accessible from HTML
window.login = login;
window.sendMessage = sendMessage;
