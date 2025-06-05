const socket = io();

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const deleteBtn = document.getElementById("delete-btn");
const logoutBtn = document.getElementById("logout-btn");

const notifToggle = document.getElementById("notif-toggle");

let loggedInUser = null;

// --- Login ---
loginBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    loginError.textContent = "Please enter username and password.";
    return;
  }
  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        loggedInUser = username;
        loginScreen.classList.add("hidden");
        chatScreen.classList.remove("hidden");
        loginError.textContent = "";
      } else {
        loginError.textContent = "Invalid username or password.";
      }
    });
});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
  loggedInUser = null;
  loginScreen.classList.remove("hidden");
  chatScreen.classList.add("hidden");
  messagesDiv.innerHTML = "";
  messageInput.value = "";
});

// --- Message sending ---
sendBtn.addEventListener("click", () => {
  sendMessage();
});
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit("send-message", { username: loggedInUser, text });
  messageInput.value = "";
}

function addMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");

  const userSpan = document.createElement("span");
  userSpan.classList.add("username");
  userSpan.textContent = msg.username;

  const textSpan = document.createElement("span");
  textSpan.classList.add("text");
  textSpan.textContent = msg.text;

  const timeSpan = document.createElement("span");
  timeSpan.classList.add("timestamp");
  timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString();

  div.appendChild(userSpan);
  div.appendChild(textSpan);
  div.appendChild(timeSpan);
  messagesDiv.appendChild(div);

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Load old messages ---
socket.on("load-messages", (msgs) => {
  messagesDiv.innerHTML = "";
  msgs.forEach(addMessage);
});

// --- New message received ---
socket.on("new-message", (msg) => {
  addMessage(msg);
  if (notifToggle.checked && document.hidden) {
    new Notification(`New message from ${msg.username}`, {
      body: msg.text,
      silent: false,
    });
  }
});

// --- Delete chat ---
deleteBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete the entire chat history?")) {
    socket.emit("delete-chat");
  }
});

socket.on("purged", () => {
  messagesDiv.innerHTML = "";
});

// --- Notifications permission ---
notifToggle.addEventListener("change", () => {
  if (notifToggle.checked && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
});
