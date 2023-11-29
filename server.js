require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
require("dotenv").config();
const { createClient } = redis;
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "DodoBot";

(async () => {
  pubClient = createClient({ url: process.env.REDIS_URL });
  await pubClient.connect();
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
})();

// Run when client connects
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit(
      "message",
      formatMessage(
        botName,
        "Benvenuti su DodoBot! Con grande entusiasmo, vi diamo il benvenuto nel distinto universo di DodoBot. È nostro desiderio informarvi che, per ogni decina di caratteri digitati, verrà applicata una tariffa simbolica di 0,50€/euro a beneficio dell'associazione Dodobusiness Onlus. Si prega di notare che questa tariffa è cumulativa fino a un massimo di 100.000,00€/euro. Desideriamo sottolineare l'importanza del rispetto degli accordi presi. In caso di mancato pagamento al termine del servizio, verranno attivate procedure conformi alle normative vigenti per garantire il recupero dei crediti a cura dei mercenari da noi assoldati Mohamed Ibrahim e Sewehli Jalloud."
      )
    );

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} è entrato nella chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} è uscito dalla chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
const IP_ADDRESS = process.env.IP_ADDRESS || "127.0.0.1";

server.listen(PORT, () => {
  console.log(`Il server è disponibile su http://${IP_ADDRESS}:${PORT}`);
});
