const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

const colors = [
  "#e53935",
  "#1e88e5",
  "#43a047",
  "#fdd835",
  "#8e24aa",
  "#fb8c00",
  "#00acc1",
  "#ec407a"
];

function createCode() {
  let code;

  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms[code]);

  return code;
}

function sendRoom(roomCode) {
  const room = rooms[roomCode];

  if (!room) return;

  io.to(roomCode).emit("roomData", {
    host: room.host,
    players: Object.values(room.players)
  });
}

io.on("connection", socket => {

  socket.on("createRoom", name => {

    const code = createCode();

    rooms[code] = {
      host: socket.id,
      started: false,
      players: {}
    };

    rooms[code].players[socket.id] = {
      id: socket.id,
      name: String(name || "Astronot")
        .substring(0, 16),
      x: 600,
      y: 350,
      color: colors[
        Math.floor(Math.random() * colors.length)
      ]
    };

    socket.join(code);

    socket.roomCode = code;

    socket.emit("roomCreated", code);

    sendRoom(code);
  });

  socket.on("joinRoom", data => {

    const code = String(data.code || "")
      .trim();

    const name = String(data.name || "Astronot")
      .trim()
      .substring(0, 16);

    const room = rooms[code];

    if (!room) {
      socket.emit(
        "roomError",
        "Bu oda bulunamadı."
      );
      return;
    }

    if (room.started) {
      socket.emit(
        "roomError",
        "Oyun zaten başladı."
      );
      return;
    }

    if (Object.keys(room.players).length >= 10) {
      socket.emit(
        "roomError",
        "Oda dolu."
      );
      return;
    }

    room.players[socket.id] = {
      id: socket.id,
      name: name || "Astronot",
      x: 600,
      y: 350,
      color: colors[
        Object.keys(room.players).length %
        colors.length
      ]
    };

    socket.join(code);

    socket.roomCode = code;

    socket.emit("joinedRoom", code);

    sendRoom(code);
  });

  socket.on("startGame", () => {

    const code = socket.roomCode;

    if (!code || !rooms[code]) return;

    const room = rooms[code];

    if (room.host !== socket.id) return;

    if (Object.keys(room.players).length < 1) return;

    room.started = true;

    io.to(code).emit("gameStarted");
  });

  socket.on("move", data => {

    const code = socket.roomCode;

    if (!code || !rooms[code]) return;

    const player = rooms[code].players[socket.id];

    if (!player) return;

    const x = Number(data.x);
    const y = Number(data.y);

    if (!Number.isFinite(x) ||
        !Number.isFinite(y)) {
      return;
    }

    player.x = Math.max(
      30,
      Math.min(1170, x)
    );

    player.y = Math.max(
      30,
      Math.min(670, y)
    );

    socket.to(code).emit("playerMoved", {
      id: socket.id,
      x: player.x,
      y: player.y
    });
  });

  socket.on("chat", message => {

    const code = socket.roomCode;

    if (!code || !rooms[code]) return;

    const player =
      rooms[code].players[socket.id];

    if (!player) return;

    message = String(message || "")
      .trim()
      .substring(0, 120);

    if (!message) return;

    io.to(code).emit("chat", {
      name: player.name,
      message
    });
  });

  socket.on("disconnect", () => {

    const code = socket.roomCode;

    if (!code || !rooms[code]) return;

    delete rooms[code].players[socket.id];

    const remaining =
      Object.keys(rooms[code].players);

    if (rooms[code].host === socket.id) {

      if (remaining.length > 0) {
        rooms[code].host = remaining[0];
      }
    }

    if (remaining.length === 0) {
      delete rooms[code];
      return;
    }

    sendRoom(code);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    "Space Crew server çalışıyor: " + PORT
  );
});
