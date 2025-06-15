const socket = io();
let currentUser = null;
let replyTo = null;
let typingTimeout;

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  socket.emit("login", { username, password });
}

socket.on("loginSuccess", ({ username, chatHistory }) => {
  currentUser = username;
  document.getElementById("login-page").style.display = "none";
  document.getElementById("chat-page").style.display = "flex";
  updateChat(chatHistory);
  socket.emit("markSeen");
});

socket.on("loginFailed", () => {
  document.getElementById("login-error").textContent = "Invalid credentials.";
});

socket.on("newMessage", (msg) => {
  addMessage(msg);
  if (msg.sender !== currentUser) socket.emit("markSeen");
});

socket.on("chatHistory", updateChat);

socket.on("updateUsers", (users) => {
  const other = Object.keys(users).find(u => u !== currentUser);
  document.getElementById("online-status").textContent =
    other + (users[other] ? " (Online)" : " (Offline)");
});

socket.on("typing", (user) => {
  document.getElementById("typing-status").textContent = user + " is typing...";
});

socket.on("stopTyping", () => {
  document.getElementById("typing-status").textContent = "";
});

function updateChat(messages) {
  const box = document.getElementById("chat-box");
  box.innerHTML = "";
  messages.forEach(addMessage);
  box.scrollTop = box.scrollHeight;
}

function addMessage(msg) {
  const msgDiv = document.createElement("div");
  msgDiv.className = msg.sender === currentUser ? "msg right" : "msg left";

  if (msg.replyTo) {
    const replyDiv = document.createElement("div");
    replyDiv.className = "reply";
    replyDiv.textContent = "Reply to: " + msg.replyTo;
    msgDiv.appendChild(replyDiv);
  }

  const textDiv = document.createElement("div");
  textDiv.innerHTML = `
    ${msg.text}
    <small>${msg.seen ? "✓✓" : "✓"}</small>
  `;
  msgDiv.appendChild(textDiv);

  if (msg.sender === currentUser) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑";
    deleteBtn.style.float = "right";
    deleteBtn.onclick = () => socket.emit("deleteMessage", msg.timestamp);
    msgDiv.appendChild(deleteBtn);
  }

  msgDiv.addEventListener("dblclick", () => {
    replyTo = msg.text;
    document.getElementById("reply-box").textContent = "Replying to: " + msg.text;
    document.getElementById("reply-box").style.display = "block";
  });

  document.getElementById("chat-box").appendChild(msgDiv);
}

function sendMessage() {
  const input = document.getElementById("message");
  const text = input.value.trim();
  if (!text) return;
  socket.emit("sendMessage", { text, replyTo });
  replyTo = null;
  document.getElementById("reply-box").style.display = "none";
  input.value = "";
}

function typing() {
  socket.emit("typing");
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("stopTyping"), 1000);
}

function stopTyping() {
  socket.emit("stopTyping");
}
