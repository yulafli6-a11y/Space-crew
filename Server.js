const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

io.on("connection", (socket) => {

  players[socket.id] = {
    id: socket.id,
    name: "Astronot",
    x: 600,
    y: 350,
    color: "#e53935"
  };

  socket.emit("playerList", players);
  socket.broadcast.emit("playerJoined", players[socket.id]);

  socket.on("setName", (name) => {
    if (typeof name !== "string") return;

    name = name.trim().substring(0, 16);

    if (!name) return;

    players[socket.id].name = name;

    io.emit("playerList", players);
  });

  socket.on("move", (data) => {

    if (!players[socket.id]) return;

    const x = Number(data.x);
    const y = Number(data.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    players[socket.id].x = x;
    players[socket.id].y = y;

    socket.broadcast.emit("playerMoved", {
      id: socket.id,
      x: x,
      y: y
    });
  });

  socket.on("chat", (message) => {

    if (typeof message !== "string") return;

    message = message.trim().substring(0, 120);

    if (!message) return;

    io.emit("chat", {
      name: players[socket.id].name,
      message: message
    });
  });

  socket.on("disconnect", () => {

    delete players[socket.id];

    io.emit("playerLeft", socket.id);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Space Crew server çalışıyor!");
});
