// Carica le variabili d'ambiente dal file .env
require("dotenv").config();

// Importazione dei moduli necessari
const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const { createAdapter } = require("@socket.io/redis-adapter");
const redis = require("redis");
const { createClient } = redis;
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

// Inizializza l'applicazione Express
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Imposta una cartella statica per file pubblici
app.use(express.static(path.join(__dirname, "public")));

// Nome del bot utilizzato per i messaggi automatici
const botName = "DodoBot";

// Configurazione del client Redis per l'adattatore di socket.io
(async () => {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  await pubClient.connect();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
})();

// Gestione dell'evento di connessione di un nuovo client
io.on("connection", (socket) => {
  console.log("Nuova connessione socket stabilita");

  // Ascolta l'evento 'joinRoom'
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    // Invia un messaggio di benvenuto all'utente corrente
    socket.emit("message", formatMessage(botName, "Benvenuto nella chat!"));

    // Invia un messaggio agli altri utenti nella stanza per avvisare dell'arrivo di un nuovo utente
    socket.broadcast
      .to(user.room)
      .emit("message", formatMessage(botName, `${user.username} è entrato nella chat`));

    // Invia informazioni sugli utenti e la stanza
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Ascolta l'evento 'chatMessage'
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Gestione della disconnessione di un client
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      // Invia un messaggio agli altri utenti nella stanza per avvisare dell'uscita di un utente
      io.to(user.room).emit("message", formatMessage(botName, `${user.username} è uscito dalla chat`));

      // Aggiorna l'elenco degli utenti nella stanza
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

// Imposta la porta e l'indirizzo IP per il server
const PORT = process.env.PORT || 3000;
const IP_ADDRESS = process.env.IP_ADDRESS || "127.0.0.1";

// Avvia il server
server.listen(PORT, () => {
  console.log(`Il server è disponibile su http://${IP_ADDRESS}:${PORT}`);
});
