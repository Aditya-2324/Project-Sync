const socket = io();
let username = '';

const loginBox = document.getElementById('loginBox');
const chatBox = document.getElementById('chatBox');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const typingDiv = document.getElementById('typing');
const statusDiv = document.getElementById('status');

const notify = {
  enabled: true,
  send: (msg) => {
    if (notify.enabled && document.hidden) {
      new Notification(`${msg.user}`, { body: msg.text });
    }
  },
};

if (Notification.permission !== 'granted') Notification.requestPermission();

function append(msg, fromSelf = false) {
  const div = document.createElement('div');
  div.className = fromSelf ? 'self' : 'other';
  div.textContent = `${msg.user}: ${msg.text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

document.getElementById('loginBtn').onclick = () => {
  socket.emit('login', {
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
  });
};

document.getElementById('send').onclick = () => {
  const text = input.value.trim();
  if (text) {
    socket.emit('sendMessage', text);
    input.value = '';
    socket.emit('typing', false);
  }
};

input.oninput = () => {
  socket.emit('typing', input.value.length > 0);
};

document.getElementById('deleteAll').onclick = () => {
  if (confirm('Delete all messages?')) socket.emit('deleteAll');
};

document.getElementById('toggleNotify').onclick = () => {
  notify.enabled = !notify.enabled;
  alert('Notifications ' + (notify.enabled ? 'enabled' : 'disabled'));
};

socket.on('loginSuccess', (data) => {
  username = data.username;
  loginBox.classList.add('hidden');
  chatBox.classList.remove('hidden');
  data.messages.forEach(msg => append(msg, msg.user === username));
});

socket.on('loginFailure', () => alert('Login failed'));
socket.on('message', (msg) => {
  append(msg, msg.user === username);
  notify.send(msg);
});
socket.on('messageDeleted', () => messages.innerHTML = '');
socket.on('typing', ({ user, isTyping }) => {
  typingDiv.textContent = isTyping ? `${user} is typing...` : '';
});
socket.on('userStatus', (users) => {
  statusDiv.innerHTML = Object.entries(users).map(([u, _]) =>
    `<span>${u} 🟢</span>`
  ).join(' ');
});
