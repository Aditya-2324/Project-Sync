const socket = io();
const form = document.getElementById('message-form');
const input = document.getElementById('message-input');
const chatBox = document.getElementById('chat-box');
const typingDiv = document.getElementById('typing');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg) {
    socket.emit('chat message', msg);
    appendMessage(msg, 'sent');
    input.value = '';
    typingDiv.textContent = '';
  }
});

input.addEventListener('input', () => {
  socket.emit('typing');
});

socket.on('chat message', (msg) => {
  appendMessage(msg, 'received');
});

socket.on('typing', () => {
  typingDiv.textContent = 'Someone is typing...';
  setTimeout(() => typingDiv.textContent = '', 2000);
});

function appendMessage(msg, type) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
