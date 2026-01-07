const socket = io();

/* ------------------ DOM ELEMENTS ------------------ */
const loginPage = document.getElementById("login-page");
const chatPage = document.getElementById("chat-page");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const typingStatus = document.getElementById("typing-status");
const onlineStatus = document.getElementById("online-status");
const clearChatBtn = document.getElementById("clear-chat-btn");

/* ------------------ STATE ------------------ */
let currentUser = null;
let typingTimeout = null;

/* ------------------ LOGIN ------------------ */
function login() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        loginError.textContent = "Username and password required";
        return;
    }

    socket.emit("login", { username, password });
}

passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
});

/* ------------------ SOCKET EVENTS ------------------ */
socket.on("loginSuccess", ({ username, chatHistory }) => {
    currentUser = username;
    loginPage.style.display = "none";
    chatPage.style.display = "block";
    loginError.textContent = "";

    chatBox.innerHTML = "";
    chatHistory.forEach(addMessage);

    scrollToBottom(true);
});

socket.on("loginFailed", () => {
    loginError.textContent = "Invalid username or password";
});

/* ------------------ USERS ONLINE ------------------ */
socket.on("updateUsers", (users) => {
    const online = Object.entries(users)
        .filter(([_, v]) => v)
        .map(([u]) => u)
        .join(", ");
    onlineStatus.textContent = online ? `Online: ${online}` : "No users online";
});

/* ------------------ MESSAGES ------------------ */
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    socket.emit("sendMessage", { text });
    messageInput.value = "";
    socket.emit("stopTyping");

    messageInput.style.height = "auto";
}

socket.on("newMessage", (message) => {
    addMessage(message);
    scrollToBottom();
});

function addMessage(message) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message " + (message.sender === currentUser ? "me" : "other");

    msgDiv.innerHTML = `
        <div class="sender">${message.sender}</div>
        <div class="text">${message.text}</div>
    `;

    chatBox.appendChild(msgDiv);
}

/* ------------------ SCROLL FIX ------------------ */
function scrollToBottom(force = false) {
    const nearBottom =
        chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 100;

    if (nearBottom || force) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

/* ------------------ TYPING ------------------ */
messageInput.addEventListener("input", () => {
    socket.emit("typing");

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping");
    }, 800);

    messageInput.style.height = "auto";
    messageInput.style.height = messageInput.scrollHeight + "px";
});

socket.on("typing", (user) => {
    if (user !== currentUser) {
        typingStatus.textContent = `${user} is typing...`;
    }
});

socket.on("stopTyping", () => {
    typingStatus.textContent = "";
});

/* ------------------ CLEAR CHAT ------------------ */
clearChatBtn.addEventListener("click", () => {
    if (confirm("Clear chat for everyone?")) {
        socket.emit("clearChat");
    }
});

socket.on("chatCleared", () => {
    chatBox.innerHTML = "";
});

/* ------------------ SEND BUTTON ------------------ */
window.sendMessage = sendMessage;
window.login = login;function updateChat(history) {
    chatBox.innerHTML = "";
    history.forEach(addMessage);
    setTimeout(() => scrollToBottom(false), 100);
}

// Render message
function addMessage(msg) {
    const div = document.createElement("div");
    div.className = `msg ${msg.sender === currentUser ? "right" : "left"}`;
    div.dataset.timestamp = msg.timestamp;

    if (msg.seen && msg.sender === currentUser) {
        div.classList.add("seen");
    }

    if (msg.replyTo) {
        const rq = document.createElement("div");
        rq.className = "reply-quote";
        rq.textContent = msg.replyTo;
        div.appendChild(rq);
    }

    div.innerHTML += `
        <div class="message-content">
            <span>${msg.text}</span>
            <small class="message-status">${msg.seen ? "✓✓" : "✓"}</small>
        </div>
    `;

    div.addEventListener("click", () => startReply(msg));
    chatBox.appendChild(div);
}

// Reply
function startReply(msg) {
    replyTo = msg.text;
    replyText.textContent = msg.text;
    replyBox.style.display = "flex";
    messageInput.focus();
}

cancelReplyBtn.onclick = () => {
    replyTo = null;
    replyBox.style.display = "none";
};

// Clear chat
clearChatBtn.onclick = () => {
    if (confirm("Clear all messages?")) {
        socket.emit("clearChat");
    }
};

// Auto resize + typing
messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
    typing();
});

messageInput.addEventListener("blur", stopTyping);

// Send on Enter
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});        if (msgInHistory) {
            msgInHistory.seen = update.seen;
        }

        // Update DOM
        const msgDiv = document.querySelector(`[data-timestamp="${update.timestamp}"]`);
        if (msgDiv) {
            const smallTag = msgDiv.querySelector('.message-status'); // Use the class name
            if (smallTag) {
                smallTag.textContent = update.seen ? "✓✓" : "✓";
                // Add/remove class for blue color
                if (update.seen) {
                    msgDiv.classList.add('seen'); // Add 'seen' class to the parent message div
                } else {
                    msgDiv.classList.remove('seen');
                }
            }
        }
    });
});

// Handle server-side chat clear
socket.on('chatCleared', () => {
    chatHistory = []; // Clear local history
    chatBox.innerHTML = ""; // Clear messages from UI
    typingStatus.textContent = "Chat history cleared.";
    setTimeout(() => typingStatus.textContent = "", 3000);
});

// Full chat history update (for initial load)
function updateChat(history) {
    chatBox.innerHTML = ""; // Clear existing messages
    history.forEach(addMessage); // Add all messages
    // Scroll after all messages are added for initial load
    setTimeout(() => {
        // Find the last message element and scroll to it
        const lastMessage = chatBox.lastElementChild;
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
            // Fallback to scrolling chatBox directly if no messages
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }, 100); // Slightly longer delay for initial load
}

// --- Message Display and Interaction (Swipe to Reply) ---
function addMessage(msg) {
    const msgDiv = document.createElement("div");
    msgDiv.className = msg.sender === currentUser ? "msg right" : "msg left";
    msgDiv.setAttribute("data-timestamp", msg.timestamp); // Essential for updates

    // Add 'seen' class if message is already seen (for initial load)
    // Only apply to messages sent by the current user
    if (msg.seen && msg.sender === currentUser) {
        msgDiv.classList.add('seen');
    }

    // Reply indicator within the message bubble
    if (msg.replyTo) {
        const replyQuoteDiv = document.createElement("div");
        replyQuoteDiv.className = "reply-quote";
        replyQuoteDiv.innerHTML = `Replying to: <span>${msg.replyTo}</span>`;
        msgDiv.appendChild(replyQuoteDiv);
    }

    const textContentDiv = document.createElement("div");
    textContentDiv.className = "message-content"; // New class for content
    textContentDiv.innerHTML = `
        <span class="message-text">${msg.text}</span>
        <small class="message-status">${msg.seen ? "✓✓" : "✓"}</small>
    `;
    msgDiv.appendChild(textContentDiv);

    // --- Message Interaction (Swipe to reply only) ---
    let startX = 0;
    let startY = 0;
    let isSwiping = false;
    const swipeThreshold = 50; // Pixels to confirm swipe for reply

    // Touch events for mobile
    msgDiv.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = false;
        msgDiv.style.transition = ''; // Remove transition during touchmove for instant response
    }, { passive: false });

    msgDiv.addEventListener('touchmove', (e) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        // Detect if movement is primarily horizontal (for swipe)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) { // Small threshold to start detecting swipe
            isSwiping = true;
            e.preventDefault(); // Prevent page scroll when swiping horizontally

            // Clamp swipe distance for visual effect
            let clampedDeltaX = Math.min(Math.max(0, deltaX), 60); // Swipe right only for others
            if (msg.sender === currentUser) { // Allow swipe left for own messages
                 clampedDeltaX = Math.max(-60, Math.min(0, deltaX));
            }
            msgDiv.style.transform = `translateX(${clampedDeltaX}px)`;
        } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
             // If primarily vertical, it's a scroll, so don't prevent default
            isSwiping = false;
            // Clear any lingering transform from minor horizontal movement
            msgDiv.style.transform = `translateX(0px)`;
        }
    }, { passive: false });

    msgDiv.addEventListener('touchend', () => {
        msgDiv.style.transition = 'transform 0.2s ease-out'; // Re-add transition for snap back

        if (isSwiping) {
            const finalDeltaX = parseFloat(msgDiv.style.transform.replace('translateX(', '').replace('px)', ''));
            if (Math.abs(finalDeltaX) >= swipeThreshold) {
                // Trigger reply action
                startReply(msg);
            }
            // Snap back the message bubble
            msgDiv.style.transform = `translateX(0px)`;
            isSwiping = false;
        }
    });

    // Fallback for desktop mouse interaction
    let mouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    msgDiv.addEventListener('mousedown', (e) => {
        mouseDown = true;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        msgDiv.style.transition = ''; // Remove transition during mousemove
        e.preventDefault(); // Prevent text selection
    });

    msgDiv.addEventListener('mousemove', (e) => {
        if (!mouseDown) return;
        const currentX = e.clientX;
        const currentY = e.clientY;
        const deltaX = currentX - mouseStartX;
        const deltaY = currentY - mouseStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) { // Smaller threshold for mouse swipe
            isSwiping = true;
            let clampedDeltaX = Math.min(Math.max(0, deltaX), 60);
            if (msg.sender === currentUser) {
                 clampedDeltaX = Math.max(-60, Math.min(0, deltaX));
            }
            msgDiv.style.transform = `translateX(${clampedDeltaX}px)`;
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
            isSwiping = false;
            msgDiv.style.transform = `translateX(0px)`;
        }
    });

    msgDiv.addEventListener('mouseup', () => {
        msgDiv.style.transition = 'transform 0.2s ease-out'; // Re-add transition
        if (mouseDown && isSwiping) {
            const finalDeltaX = parseFloat(msgDiv.style.transform.replace('translateX(', '').replace('px)', ''));
            if (Math.abs(finalDeltaX) >= swipeThreshold) {
                startReply(msg);
            }
            msgDiv.style.transform = `translateX(0px)`;
        }
        mouseDown = false;
        isSwiping = false;
    });

    chatBox.appendChild(msgDiv);
    // Initial scroll is handled by updateChat and newMessage event listeners with timeout
}

// --- Reply Feature ---
function startReply(msg) {
    replyTo = msg.text; // Store the text being replied to
    replyText.textContent = msg.text;
    replyBox.style.display = "flex"; // Show reply box
    messageInput.focus(); // Focus input for typing reply
}

cancelReplyBtn.addEventListener("click", () => {
    replyTo = null;
    replyText.textContent = "";
    replyBox.style.display = "none";
});

// --- Clear Chat Functionality ---
clearChatBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear ALL chat messages? This cannot be undone.")) {
        socket.emit("clearChat");
    }
});

// --- Textarea Auto-resize ---
messageInput.addEventListener("input", function() {
    this.style.height = 'auto'; // Reset height
    this.style.height = (this.scrollHeight) + 'px'; // Set to scroll height
    typing(); // Call your typing function
});

// !!! FIX: Now refers to the defined stopTyping function !!!
messageInput.addEventListener("blur", stopTyping);

messageInput.addEventListener("focus", () => {
    // Scroll to bottom when input is focused if it's not already at the very bottom
    // This helps with the virtual keyboard, scrolls the entire page
    setTimeout(() => {
        const lastMessage = chatBox.lastElementChild;
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
            // Fallback to scrolling chatBox directly if no messages
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }, 50); // Small delay
});

// Handle send on Enter key
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { // Prevent new line on Enter, allow with Shift+Enter
        e.preventDefault(); // Prevent default Enter behavior (new line)
        sendMessage();
    }
});
