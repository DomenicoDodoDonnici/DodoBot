// Riferimenti agli elementi DOM della chat
const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");

// Estrae username e room dall'URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

// Connessione al server Socket.io
const socket = io();

// Richiede l'ingresso in una stanza di chat
socket.emit("joinRoom", { username, room });

// Ricezione dati stanza e utenti dal server
socket.on("roomUsers", ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Ricezione di messaggi dal server
socket.on("message", (message) => {
  console.log(message);
  outputMessage(message);

  // Scorre automaticamente in basso al ricevimento di un nuovo messaggio
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Gestione dell'invio di messaggi
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Ottiene il testo del messaggio
  let msg = e.target.elements.msg.value;
  msg = msg.trim();

  if (!msg) {
    return false;
  }

  // Invia il messaggio al server
  socket.emit("chatMessage", msg);

  // Pulisce il campo di input dopo l'invio
  e.target.elements.msg.value = "";
  e.target.elements.msg.focus();
});

// Visualizza i messaggi nella chat
function outputMessage(message) {
  const div = document.createElement("div");
  div.classList.add("message");
  const p = document.createElement("p");
  p.classList.add("meta");
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement("p");
  para.classList.add("text");
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector(".chat-messages").appendChild(div);
}

// Aggiorna il nome della stanza nella DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

// Aggiorna la lista degli utenti nella DOM
function outputUsers(users) {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.innerText = user.username;
    userList.appendChild(li);
  });
}

// Conferma prima di uscire dalla stanza di chat
document.getElementById("leave-btn").addEventListener("click", () => {
  const leaveRoom = confirm("Sei sicuro di voler uscire dalla stanza?");
  if (leaveRoom) {
    window.location = "../index.html";
  }
});
