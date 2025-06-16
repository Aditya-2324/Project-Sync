const socket = io();
const credentials = { user: "admin", pass: "1234" };

let myName = "";
let replyTo = null;

document.getElementById("messageInput").addEventListener("keyup", (e) => {
  if (e.key === "Enter") sendMessage();
  else socket.emit("typing", myName);
});

function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  if (user === credentials.user && pass === credentials.pass) {
    myName = user;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("chat").classList.remove("hidden");
    document.getElementById("status").innerText = "Online";
    socket.emit("user-connected", user);
  } else {
    alert("Invalid credentials");
  }
}

function sendMessage() {
  const msg = document.getElementById("messageInput").value.trim();
  if (msg) {
    socket.emit("message", { from: myName, text: msg, replyTo });
    document.getElementById("messageInput").value = "";
    replyTo = null;
    showTyping("");
  }
}

function showTyping(user) {
  document.getElementById("typingIndicator").innerText = user ? `${user} is typing...` : "";
}

socket.on("typing", showTyping);

socket.on("message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.from === myName ? "user" : "other");

  if (msg.replyTo) {
    const reply = document.createElement("div");
    reply.classList.add("reply");
    reply.innerText = "Reply to: " + msg.replyTo;
    div.appendChild(reply);
  }

  const content = document.createElement("div");
  content.innerText = msg.text;
  content.ondblclick = () => { replyTo = msg.text; };
  div.appendChild(content);

  const seen = document.createElement("div");
  seen.className = "status";
  seen.innerText = msg.from === myName ? "✓✓ Seen" : "✓ Delivered";
  div.appendChild(seen);

  document.getElementById("chatBox").appendChild(div);
  document.getElementById("chatBox").scrollTop = document.getElementById("chatBox").scrollHeight;
});
