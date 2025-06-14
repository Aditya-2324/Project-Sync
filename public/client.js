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
  document.getElementById("chat-page").style.display = "block";
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
  textDiv.innerHTML = msg.text + ` <small>${msg.seen ? "✓✓" : "✓"}</small>`;
  msgDiv.appendChild(textDiv);

  // Add swipe support
  let touchStartX = 0;

  msgDiv.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });

  msgDiv.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX;

    // Only act if horizontal swipe is significant
    if (Math.abs(diffX) > 50) {
      const isRightSwipe = diffX > 0;
      const isLeftAligned = msgDiv.classList.contains("left");
      const isRightAligned = msgDiv.classList.contains("right");

      if ((isRightSwipe && isLeftAligned) || (!isRightSwipe && isRightAligned)) {
        replyTo = msg.text;
        document.getElementById("reply-box").textContent = "Replying to: " + msg.text;
        document.getElementById("reply-box").style.display = "block";
      }
    }
  });

  document.getElementById("chat-box").appendChild(msgDiv);
}

function handleSwipe(msgDiv, text, sender) {
  const diff = touchEndX - touchStartX;
  if (Math.abs(diff) > 50) {
    // Allow only swipe-right on left messages, and swipe-left on right messages
    const isRightSwipe = diff > 0;
    const isLeftAligned = msgDiv.classList.contains("left");
    const isRightAligned = msgDiv.classList.contains("right");

    if ((isRightSwipe && isLeftAligned) || (!isRightSwipe && isRightAligned)) {
      replyTo = text;
      document.getElementById("reply-box").textContent = "Replying to: " + text;
    }
  }
}

function sendMessage() {
  const input = document.getElementById("message");
  const text = input.value.trim();
  if (!text) return;
  socket.emit("sendMessage", { text, replyTo });
  replyTo = null;
  document.getElementById("reply-box").textContent = "";
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
// Disable horizontal swipe scrolling on mobile
window.addEventListener('touchmove', function (e) {
  if (e.touches.length > 1 || (e.scale && e.scale !== 1)) return;
  e.preventDefault();
}, { passive: false });
