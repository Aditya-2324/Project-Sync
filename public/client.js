const socket = io();

let currentUser = null;
let chatHistory = [];
let replyTo = null; // Stores the text being replied to
let longPressTimeout;
let selectedMessages = new Set(); // To store timestamps of selected messages

const longPressDuration = 500; // ms

// DOM Elements
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
const deleteSelectedBtn = document.getElementById("delete-selected-btn");

// --- Login Logic ---
function login() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (username && password) {
        socket.emit("login", { username, password });
    } else {
        loginError.textContent = "Please enter username and password.";
    }
}

socket.on("loginSuccess", (data) => {
    currentUser = data.username;
    chatHistory = data.chatHistory;
    loginPage.style.display = "none";
    chatPage.style.display = "flex";
    onlineStatus.textContent = `Welcome, ${currentUser}!`;
    updateChat(chatHistory); // Display initial chat history
    // Mark all other users' messages as seen when current user logs in
    chatHistory.forEach(msg => {
        if (msg.sender !== currentUser && !msg.seen) {
            socket.emit("markSeen", msg.timestamp);
        }
    });
});

socket.on("loginFailed", () => {
    loginError.textContent = "Invalid username or password.";
});

// --- User Status Updates ---
socket.on("updateUsers", (users) => {
    let onlineUsers = Object.keys(users).filter(user => users[user] && user !== currentUser);
    let statusText = `Users online: ${onlineUsers.join(', ')}`;
    if (onlineUsers.length === 0) {
        statusText = "No other users online.";
    }
    onlineStatus.textContent = `Welcome, ${currentUser}! ${statusText}`;
});

// --- Typing Status ---
let typingTimer;
const typingDelay = 1000; // Milliseconds

function typing() {
    socket.emit("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        socket.emit("stopTyping");
    }, typingDelay);
}

function stopTyping() {
    clearTimeout(typingTimer);
    socket.emit("stopTyping");
}

socket.on("typing", (username) => {
    if (username !== currentUser) {
        typingStatus.textContent = `${username} is typing...`;
    }
});

socket.on("stopTyping", (username) => {
    if (username !== currentUser) {
        typingStatus.textContent = "";
    }
});

// --- Message Handling ---
function sendMessage() {
    const text = messageInput.value.trim();
    if (text) {
        const messageToSend = {
            text: text,
            replyTo: replyTo, // Include replyTo data
        };
        socket.emit("sendMessage", messageToSend);
        messageInput.value = ""; // Clear input
        messageInput.style.height = "auto"; // Reset textarea height
        replyTo = null; // Clear reply context
        replyBox.style.display = "none"; // Hide reply box
        typingStatus.textContent = ""; // Clear typing status for self
        stopTyping(); // Ensure stopTyping is sent
    }
}

socket.on("newMessage", (msg) => {
    chatHistory.push(msg); // Add new message to local history
    addMessage(msg); // Display the message
    // Mark as seen if not from current user and chat page is active
    if (msg.sender !== currentUser) {
        socket.emit("markSeen", msg.timestamp); // Emit timestamp of the message that was seen
    }
    // Auto-scroll to bottom only if user is already near the bottom
    const isScrolledToBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1; // Tolerance 1px
    if (isScrolledToBottom) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});

// Update an existing message (e.g., seen status)
socket.on('messagesUpdated', (updatedMessages) => {
    updatedMessages.forEach(update => {
        // Update local chatHistory array
        const msgInHistory = chatHistory.find(msg => msg.timestamp === update.timestamp);
        if (msgInHistory) {
            msgInHistory.seen = update.seen;
        }

        // Update DOM
        const msgDiv = document.querySelector(`[data-timestamp="${update.timestamp}"]`);
        if (msgDiv) {
            const smallTag = msgDiv.querySelector('small');
            if (smallTag) {
                smallTag.textContent = update.seen ? "✓✓" : "✓";
            }
        }
    });
});


// Remove a message from UI and local history
socket.on("messageDeleted", (timestamp) => {
    chatHistory = chatHistory.filter(msg => msg.timestamp !== timestamp); // Update local history
    const msgDivToRemove = document.querySelector(`[data-timestamp="${timestamp}"]`);
    if (msgDivToRemove) {
        msgDivToRemove.remove(); // Remove from DOM
    }
    // If deleted message was selected, unselect it
    selectedMessages.delete(timestamp);
    updateDeleteButtonVisibility();
});

// Full chat history update (for initial load)
function updateChat(history) {
    chatBox.innerHTML = ""; // Clear existing messages
    history.forEach(addMessage); // Add all messages
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
}

// --- Message Display and Interaction ---
function addMessage(msg) {
    const msgDiv = document.createElement("div");
    msgDiv.className = msg.sender === currentUser ? "msg right" : "msg left";
    msgDiv.setAttribute("data-timestamp", msg.timestamp); // Essential for updates/deletion

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
        ${msg.text}
        <small>${msg.seen ? "✓✓" : "✓"}</small>
    `;
    msgDiv.appendChild(textContentDiv);

    // --- Message Interaction (Long-press to select, Swipe to reply) ---
    let startX = 0;
    let startY = 0;
    let isSwiping = false;
    const swipeThreshold = 50; // Pixels to confirm swipe for reply

    msgDiv.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = false;

        // Start long-press timer only if no messages are selected
        if (selectedMessages.size === 0) {
            longPressTimeout = setTimeout(() => {
                // If it's a long press and not a swipe, toggle selection
                if (!isSwiping) {
                    toggleMessageSelection(msgDiv, msg.timestamp);
                }
            }, longPressDuration);
        }
        // Prevent default browser behavior like context menu on long-press
        e.preventDefault();
    }, { passive: false }); // passive: false for preventDefault

    msgDiv.addEventListener('touchmove', (e) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        // If a long press timer is active, clear it if movement is detected
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
        }

        // Detect if movement is primarily horizontal (for swipe)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) { // Small threshold to start detecting swipe
            isSwiping = true;
            e.preventDefault(); // Prevent page scroll when swiping horizontally
            
            // Clamp swipe distance for visual effect
            let clampedDeltaX = Math.min(Math.max(0, deltaX), 60); // Swipe right only, max 60px
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
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
        }

        // If it was a swipe (and not just a click/tap)
        if (isSwiping) {
            const finalDeltaX = parseInt(msgDiv.style.transform.replace('translateX(', '').replace('px)', ''));
            if (Math.abs(finalDeltaX) >= swipeThreshold) {
                // Trigger reply action
                startReply(msg);
            }
            // Snap back the message bubble
            msgDiv.style.transform = `translateX(0px)`;
            isSwiping = false;
        } else {
            // If it wasn't a swipe or long-press, it's a regular tap
            if (selectedMessages.size > 0) {
                // If messages are already selected, a tap toggles selection
                toggleMessageSelection(msgDiv, msg.timestamp);
            } else {
                // If no messages are selected, a tap could be a quick reply or just viewing
                // For now, let's keep dblclick for explicit reply, or remove it entirely
                // msgDiv.dispatchEvent(new Event('dblclick')); // Re-trigger dblclick if you want single tap for quick reply
            }
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
        if (selectedMessages.size === 0) {
            longPressTimeout = setTimeout(() => {
                if (mouseDown) { // Still holding mouse down
                    toggleMessageSelection(msgDiv, msg.timestamp);
                }
            }, longPressDuration);
        }
        e.preventDefault(); // Prevent text selection
    });

    msgDiv.addEventListener('mousemove', (e) => {
        if (!mouseDown) return;
        const currentX = e.clientX;
        const currentY = e.clientY;
        const deltaX = currentX - mouseStartX;
        const deltaY = currentY - mouseStartY;

        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
        }

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) { // Smaller threshold for mouse swipe
            isSwiping = true;
            let clampedDeltaX = Math.min(Math.max(0, deltaX), 60);
             if (msg.sender === currentUser) { // Allow swipe left for own messages
                 clampedDeltaX = Math.max(-60, Math.min(0, deltaX));
            }
            msgDiv.style.transform = `translateX(${clampedDeltaX}px)`;
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
            isSwiping = false;
            msgDiv.style.transform = `translateX(0px)`;
        }
    });

    msgDiv.addEventListener('mouseup', () => {
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
        }
        if (mouseDown) {
            if (isSwiping) {
                const finalDeltaX = parseInt(msgDiv.style.transform.replace('translateX(', '').replace('px)', ''));
                if (Math.abs(finalDeltaX) >= swipeThreshold) {
                    startReply(msg);
                }
                msgDiv.style.transform = `translateX(0px)`;
            } else if (selectedMessages.size > 0) {
                 toggleMessageSelection(msgDiv, msg.timestamp);
            }
        }
        mouseDown = false;
        isSwiping = false;
    });

    // Cancel long press if mouse leaves the element
    msgDiv.addEventListener('mouseleave', () => {
        if (mouseDown && !isSwiping && longPressTimeout) {
            clearTimeout(longPressTimeout);
        }
    });

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Keep this for new messages
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

// --- Message Selection & Deletion ---
function toggleMessageSelection(msgDiv, timestamp) {
    if (msgDiv.classList.contains('selected-message')) {
        msgDiv.classList.remove('selected-message');
        selectedMessages.delete(timestamp);
    } else {
        // Only allow selection of your own messages for deletion
        const msg = chatHistory.find(m => m.timestamp === timestamp);
        if (msg && msg.sender === currentUser) {
            msgDiv.classList.add('selected-message');
            selectedMessages.add(timestamp);
        }
    }
    updateDeleteButtonVisibility();
}

function updateDeleteButtonVisibility() {
    if (selectedMessages.size > 0) {
        deleteSelectedBtn.style.display = "block";
    } else {
        deleteSelectedBtn.style.display = "none";
    }
}

deleteSelectedBtn.addEventListener("click", () => {
    if (confirm(`Are you sure you want to delete ${selectedMessages.size} selected message(s)?`)) {
        selectedMessages.forEach(timestamp => {
            socket.emit("deleteMessage", timestamp);
        });
        selectedMessages.clear(); // Clear selection after emitting delete requests
        updateDeleteButtonVisibility();
    }
});

// --- Textarea Auto-resize ---
messageInput.addEventListener("input", function() {
    this.style.height = 'auto'; // Reset height
    this.style.height = (this.scrollHeight) + 'px'; // Set to scroll height
    typing(); // Call your typing function
});

messageInput.addEventListener("blur", stopTyping); // Add blur listener
messageInput.addEventListener("focus", () => {
    // Scroll to bottom when input is focused if it's not already at the very bottom
    // This helps with the virtual keyboard
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Handle send on Enter key
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { // Prevent new line on Enter, allow with Shift+Enter
        e.preventDefault(); // Prevent default Enter behavior (new line)
        sendMessage();
    }
});
