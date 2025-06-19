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
    // Only mark seen if the message is from the other user AND they are currently focused
    // You might want to debounce this or only mark the *last* message seen.
    if (msg.sender !== currentUser) {
        socket.emit("markSeen", msg.timestamp); // Emit the timestamp of the message that was seen
    }
});

// New event listener for specific message updates (e.g., seen status)
socket.on('messagesUpdated', (updatedMessages) => {
    updatedMessages.forEach(update => {
        const msgDiv = document.querySelector(`[data-timestamp="${update.timestamp}"]`);
        if (msgDiv) {
            const smallTag = msgDiv.querySelector('small');
            if (smallTag) {
                smallTag.textContent = update.seen ? "✓✓" : "✓";
            }
        }
    });
});

socket.on('chatHistory', updateChat); // Keep this for initial load or full history syncs if needed

// ... existing socket.on events ...

socket.on("messageDeleted", (timestamp) => {
    const msgDivToRemove = document.querySelector(`[data-timestamp="${timestamp}"]`);
    if (msgDivToRemove) {
        msgDivToRemove.remove();
    }
});

// ... rest of your client.js ...

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
    msgDiv.setAttribute("data-timestamp", msg.timestamp); // <<< ADD THIS LINE

    if (msg.replyTo) {
        const replyDiv = document.createElement("div");
        replyDiv.className = "reply";
        replyDiv.textContent = "Reply to: " + msg.replyTo;
        msgDiv.appendChild(replyDiv);
    }

    const textDiv = document.createElement("div");
    // Update the seen indicator logic slightly if you always want '✓' even if not seen by self
    // If msg.sender === currentUser, maybe always show '✓✓' regardless of msg.seen from server perspective
    textDiv.innerHTML = `
        ${msg.text}
        <small>${msg.seen ? "✓✓" : "✓"}</small>
    `;
    msgDiv.appendChild(textDiv);

    if (msg.sender === currentUser) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑";
        deleteBtn.style.float = "right"; // Keep this for now, but consider CSS placement
        deleteBtn.onclick = () => socket.emit("deleteMessage", msg.timestamp);
        msgDiv.appendChild(deleteBtn);
    }

    msgDiv.addEventListener("dblclick", () => {
        replyTo = msg.text; // Consider storing msg.sender and msg.timestamp for more precise replies
        document.getElementById("reply-box").textContent = "Replying to: " + msg.text;
        document.getElementById("reply-box").style.display = "block";
    });

    document.getElementById("chat-box").appendChild(msgDiv);
    // Ensure scroll to bottom after adding new message if it's the current user or already at bottom
    document.getElementById("chat-box").scrollTop = document.getElementById("chat-box").scrollHeight; // <<< Add this here too
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
