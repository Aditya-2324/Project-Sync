const socket = io();
let username;

function login() {
  username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('chat-screen').style.display = 'block';
      socket.emit('join', username);
      fetchMessages();
    } else {
      alert('Invalid credentials');
    }
  });
}

function fetchMessages() {
  fetch('/messages')
    .then(res => res.json())
    .then(data => {
      const box = document.getElementById('chat-box');
      box.innerHTML = '';
      data.forEach(msg => renderMsg(msg));
    });
}

function sendMsg() {
  const input = document.getElementById('msg-input');
  const msg = {
    id: Date.now().toString(),
    from: username,
    text: input.value,
    time: new Date().toLocaleTimeString(),
    seen: false
  };
  socket.emit('message', msg);
  input.value = '';
  renderMsg(msg);
}

function deleteChat() {
  fetch('/delete-all', { method: 'POST' });
}

function renderMsg(msg) {
  const box = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = 'bubble ' + (msg.from === username ? 'me' : 'them');
  div.innerHTML = `
    <span>${msg.text}</span>
    <small>${msg.time}${msg.seen ? ' ✅' : ''}</small>
  `;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

const input = document.getElementById('msg-input');
input.addEventListener('input', () => {
  socket.emit('typing', { from: username, isTyping: input.value.length > 0 });
});

socket.on('message', msg => renderMsg(msg));
socket.on('cleared', () => document.getElementById('chat-box').innerHTML = '');
socket.on('typing', ({ from, isTyping }) => {
  document.getElementById('typing').innerText = isTyping ? `${from} is typing...` : '';
});
socket.on('online-users', (list) => {
  document.getElementById('status-bar').innerText =
    Object.keys(list).join(', ') + ' online';
});
