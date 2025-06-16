const socket = io();

let currentUser = null;

const loginPage = document.getElementById('login-page');
const chatPage = document.getElementById('chat-page');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const messageInput = document.getElementById('message');
const chatBox = document.getElementById('chat-box');
const typingStatus = document.getElementById('typing-status');
const onlineStatus = document.getElementById('online-status');

const validUsers = {
  user: '1234',
  admin: 'admin123',
};

function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (validUsers[username] === password) {
    currentUser = username;
    loginPage.style.display = 'none';
    chatPage.style.display = 'flex';
    onlineStatus.innerText = 'Online';
    socket.emit('user connected', username);
  } else {
    loginError.innerText = 'Invalid credentials';
  }
}

function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg) return;

  socket.emit('chat message', { user: currentUser, text: msg });
  messageInput.value = '';
}

socket.on('chat message', (msg) => {
  const item = document.createElement('div');
  item.className = msg.user === currentUser ? 'msg own' : 'msg';

  const text = document.createElement('div');
  text.innerText = msg.text;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerText = msg.user === currentUser ? '✓✓' : msg.user;

  const deleteBtn = document.createElement('span');
  deleteBtn.innerText = '🗑️';
  deleteBtn.className = 'delete-btn';
  deleteBtn.onclick = () => item.remove();

  item.appendChild(text);
  item.appendChild(meta);
  if (msg.user === currentUser) item.appendChild(deleteBtn);

  chatBox.appendChild(item);
  chatBox.scrollTop = chatBox.scrollHeight;
});

function typing() {
  socket.emit('typing', currentUser);
}

function stopTyping() {
  setTimeout(() => {
    typingStatus.innerText = '';
  }, 2000);
}

socket.on('show typing', (user) => {
  if (user !== currentUser) {
    typingStatus.innerText = `${user} is typing...`;
    stopTyping();
  }
});

socket.on('connect', () => {
  if (currentUser) {
    socket.emit('user connected', currentUser);
    onlineStatus.innerText = 'Online';
  }
});

socket.on('disconnect', () => {
  onlineStatus.innerText = 'Offline';
});

window.login = login;
window.sendMessage = sendMessage;
window.typing = typing;
window.stopTyping = stopTyping;
