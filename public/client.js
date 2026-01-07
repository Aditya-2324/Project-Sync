const socket = io();

let currentUser = "";
let replyingTo = null;
let typingTimer = null;

// ---------------- LOGIN ----------------
window.login = function () {
  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");
  const errorEl = document.getElementById("login-error");

  if (!usernameEl || !passwordEl) {
    console.error("Login inputs not found");
    return;
  }

  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();

  if (!username || !password) {
    errorEl.textContent = "Please enter username and password";
    return;
  }

  socket.emit("login", { username, password });
};

socket.on("loginSuccess", (data) => {
  currentUser = data.username;

  document.getElementById("login-page").style.display = "none";
  document.getElementById("chat-page").style.display = "flex";

  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "";

  data.chatHistory.forEach(addMessageToUI);
  scrollToBottom();
});

socket.on("loginFailed", () => {
  document.getElementById("login-error").textContent =
    "Invalid username or password";
});

// ---------------- SEND MESSAGE ----------------
window.sendMessage = function () {
  const input = document.getElementById("message");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  socket.emit("sendMessage", {
    text,
    replyTo: replyingTo,
  });

  input.value = "";
  cancelReply();
};

// ---------------- RECEIVE MESSAGE ----------------
socket.on("newMessage", (msg) => {
  addMessageToUI(msg);

  if (msg.sender !== currentUser) {
    socket.emit("markSeen", msg.timestamp);
  }
});

// ---------------- UI HELPERS ----------------
function addMessageToUI(msg) {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return;

  const div = document.createElement("div");
  div.className = `msg ${msg.sender === currentUser ? "right" : "left"}`;

  let replyHtml = "";
  if (msg.replyTo) {
    replyHtml = `
      <div class="reply-quote">
        Replying to: ${msg.replyTo}
      </div>`;
  }

  div.innerHTML = `
    ${replyHtml}
    <div class="message-content">
      <span class="message-text">${msg.text}</span>
      <span class="message-status">${msg.seen ? "✓✓" : "✓"}</span>
    </div>
  `;

  chatBox.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return;

  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------------- TYPING STATUS ----------------
const messageInput = document.getElementById("message");

if (messageInput) {
  messageInput.addEventListener("input", () => {
    socket.emit("typing", currentUser);

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit("stopTyping");
    }, 1500);
  });
}

socket.on("typing", (username) => {
  const statusEl = document.getElementById("typing-status");
  if (statusEl) {
    statusEl.textContent = `${username} is typing...`;
  }
});

socket.on("stopTyping", () => {
  const statusEl = document.getElementById("typing-status");
  if (statusEl) {
    statusEl.textContent = "";
  }
});

// ---------------- ONLINE USERS ----------------
socket.on("updateUsers", (users) => {
  const onlineStatus = document.getElementById("online-status");
  if (!onlineStatus) return;

  const onlineUsers = Object.keys(users).filter(
    (u) => users[u] && u !== currentUser
  );

  onlineStatus.textContent = onlineUsers.length
    ? Online: ${onlineUsers.join(", ")}
    : "No other users online";
});

// ---------------- CLEAR CHAT ----------------
const clearBtn = document.getElementById("clear-chat-btn");

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (confirm("Clear all messages for everyone?")) {
      socket.emit("clearChat");
    }
  });
}

socket.on("chatCleared", () => {
  const chatBox = document.getElementById("chat-box");
  if (chatBox) chatBox.innerHTML = "";
});

// ---------------- REPLY ----------------
function cancelReply() {
  replyingTo = null;

  const replyBox = document.getElementById("reply-box");
  if (replyBox) replyBox.style.display = "none";
}
