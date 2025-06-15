const socket = io();
let currentUser = null, replyTo = null, typingTimeout;

function login(){
  socket.emit('login', {
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value.trim()
  });
}

socket.on('loginSuccess', ({username, chatHistory})=>{
  currentUser = username;
  document.getElementById('login-page').style.display='none';
  document.getElementById('chat-page').style.display='flex';
  updateChat(chatHistory);
});

socket.on('loginFailed', ()=>{
  document.getElementById('login-error').textContent='Invalid credentials!';
});

socket.on('updateUsers', users=>{
  document.getElementById('online-status').textContent = 
    users.includes(currentUser)? 'You are online' : '';
});

socket.on('newMessage', msg => {
  addMessage(msg);
});

socket.on('chatDeleted', ()=>{
  document.getElementById('chat-box').innerHTML='';
});

function updateChat(messages){
  const box = document.getElementById('chat-box');
  box.innerHTML=''; messages.forEach(addMessage);
  box.scrollTop = box.scrollHeight;
}

function addMessage(msg){
  const div = document.createElement('div');
  div.className = msg.sender === currentUser ? 'msg right' : 'msg left';

  if(msg.replyTo){
    const r = document.createElement('div');
    r.className='reply';
    r.textContent='Reply: '+msg.replyTo;
    div.appendChild(r);
  }

  const text = document.createElement('div');
  text.textContent = msg.text;
  const info = document.createElement('small');
  info.textContent = new Date(msg.timestamp).toLocaleTimeString();

  text.appendChild(info);
  div.appendChild(text);

  let startX;
  div.addEventListener('touchstart', e=> startX=e.touches[0].clientX);
  div.addEventListener('touchend', e=>{
    const diff = e.changedTouches[0].clientX - startX;
    if(Math.abs(diff)>60){
      const left = diff>0 && div.classList.contains('left');
      const right = diff<0 && div.classList.contains('right');
      if(left||right){
        replyTo = msg.text;
        const rb = document.getElementById('reply-box');
        rb.textContent = 'Replying: ' + msg.text;
        rb.style.display = 'block';
      }
    }
  });

  document.getElementById('chat-box').appendChild(div);
  const box = document.getElementById('chat-box');
  box.scrollTop = box.scrollHeight;
}

function sendMessage(){
  const inp = document.getElementById('message');
  const text = inp.value.trim();
  if(!text) return;
  socket.emit('sendMessage',{text, replyTo});
  replyTo = null;
  document.getElementById('reply-box').style.display='none';
  inp.value='';
}

function deleteChat(){
  socket.emit('deleteChat');
}
function typing(){
  clearTimeout(typingTimeout);
  socket.emit('typing');
  typingTimeout = setTimeout(()=>socket.emit('stopTyping'),800);
}
function stopTyping(){ socket.emit('stopTyping'); }

