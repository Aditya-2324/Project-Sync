// client.js
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

socket.on("newMessage", (message) => {
  addMessage(message);
  scrollChatToBottom();
});

socket.on("chatHistory", (chatHistory) => {
  updateChat(chatHistory);
});

socket.on("typing", (user) => {
  if (user !== currentUser) {
    document.getElementById("typing-status").textContent = `${user} is typing...`;
  }
});

socket.on("stopTyping", () => {
  document.getElementById("typing-status").textContent = "";
});

function sendMessage() {
  const input = document.getElementById("message");
  const text = input.value.trim();
  if (!text) return;

  const message = {
    text,
    replyTo
  };

  socket.emit("sendMessage", message);
  input.value = "";
  replyTo = null;
  document.getElementById("reply-box").style.display = "none";
  stopTyping();
}

function typing() {
  socket.emit("typing");
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 2000);
}

function stopTyping() {
  socket.emit("stopTyping");
}

function updateChat(messages) {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "";
  messages.forEach(addMessage);
  scrollChatToBottom();
}

function addMessage(msg) {
  const div = document.createElement("div");
  div.className = `msg ${msg.sender === currentUser ? "right" : "left"}`;
  div.innerHTML = `<div>${msg.replyTo ? `<i>Replying: ${msg.replyTo}</i><br>` : ""}${msg.text}</div><small>${msg.sender}${msg.seen ? " ✓✓" : " ✓"}</small>`;
  div.ondblclick = () => setReply(msg.text);
  div.oncontextmenu = (e) => {
    e.preventDefault();
    if (msg.sender === currentUser) {
      div.remove(); // local delete only for now
    }
  };
  document.getElementById("chat-box").appendChild(div);
}

function setReply(text) {
  replyTo = text;
  const replyBox = document.getElementById("reply-box");
  replyBox.style.display = "block";
  replyBox.textContent = `Replying to: ${text}`;
}

function scrollChatToBottom() {
  const chatBox = document.getElementById("chat-box");
  chatBox.scrollTop = chatBox.scrollHeight;
}
