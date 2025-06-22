const socket = io();

let currentUser = null;
let chatHistory = [];
let replyTo = null; // Stores the text being replied to

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
const clearChatBtn = document.getElementById("clear-chat-btn"); // Clear Chat Button

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
    updateChat(chatHistory); // Display initial chat history
    
    // Mark all other users' messages as seen when current user logs in
    // This happens only once on initial load for messages already in history
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
    let statusText = `Online: ${onlineUsers.join(', ')}`;
    if (onlineUsers.length === 0) {
        statusText = "No other users online.";
    }
    onlineStatus.textContent = statusText; // Only show other users' online status
});

// --- Typing Status ---
let typingTimer;
const typingDelay = 1000; // Milliseconds

// Inside typing() function
function typing() {
    console.log("Client: User started typing, emitting 'typing' event."); // ADD THIS
    socket.emit("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        console.log("Client: Typing delay ended, emitting 'stopTyping' event."); // ADD THIS
        socket.emit("stopTyping");
    }, typingDelay);
}

// Inside socket.on("typing")
socket.on("typing", (username) => {
    console.log(`Client: Received 'typing' event from: ${username}`); // ADD THIS
    if (username !== currentUser) {
        typingStatus.textContent = `${username} is typing...`;
    }
});

// Inside socket.on("stopTyping")
socket.on("stopTyping", (username) => {
    console.log(`Client: Received 'stopTyping' event from: ${username}`); // ADD THIS
    if (username !== currentUser) {
        typingStatus.textContent = "";
    }
});
socket.on("typing", (username) => {
    if (username !== currentUser) {
        typingStatus.textContent = `${username} is typing...`;
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
    if (msg.sender !== currentUser) { // Only mark messages from others as seen
        socket.emit("markSeen", msg.timestamp); // Emit timestamp of the message that was seen
    }
    // New/Updated scrolling logic for new messages
    setTimeout(() => {
        messageInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50); // Small delay
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
        messageInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
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

messageInput.addEventListener("blur", stopTyping);

messageInput.addEventListener("focus", () => {
    // Scroll to bottom when input is focused if it's not already at the very bottom
    // This helps with the virtual keyboard, scrolls the entire page
    setTimeout(() => {
        messageInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50); // Small delay
});

// Handle send on Enter key
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { // Prevent new line on Enter, allow with Shift+Enter
        e.preventDefault(); // Prevent default Enter behavior (new line)
        sendMessage();
    }
});
