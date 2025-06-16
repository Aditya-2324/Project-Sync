const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('m');
const messages = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const userStatus = document.getElementById('user-status');

// Hardcoded username
const username = "user";

socket.on('connect', () => {
  userStatus.innerText = 'Online';
});

socket.on('disconnect', () => {
  userStatus.innerText = 'Offline';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', { user: username, text: input.value });
    input.value = '';
  }
});

socket.on('chat message', (msg) => {
  const item = document.createElement('div');
  item.className = msg.user === username ? 'msg own' : 'msg';

  const text = document.createElement('div');
  text.innerText = msg.text;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerText = msg.user === username ? '✓✓' : '';

  const deleteBtn = document.createElement('span');
  deleteBtn.innerText = '🗑️';
  deleteBtn.className = 'delete-btn';
  deleteBtn.onclick = () => item.remove();

  item.appendChild(text);
  item.appendChild(meta);
  if (msg.user === username) item.appendChild(deleteBtn);

  messages.appendChild(item);
  scrollToBottom();
});

input.addEventListener('input', () => {
  socket.emit('typing', username);
});

socket.on('show typing', (user) => {
  typingIndicator.innerText = `${user} is typing...`;
  setTimeout(() => {
    typingIndicator.innerText = '';
  }, 2000);
});

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}
