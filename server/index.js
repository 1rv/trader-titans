const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

// Create express app
const app = express();
app.use(cors());

// Server
const http = require('http');
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// maintain a list of active rooms
const rooms = new Set();

// Admin - head of room

const adminNamespace = io.of("/admin");

adminNamespace.on("connection", socket => {
  let roomStarted = false;
  let choiceCount = 0;
  socket.on("room-start", (room) => {
    if (roomStarted) return;
    socket.join(room);
    console.log(room);

    io.to(room).emit('Admin connected');
    if (rooms.has(room)) {
      socket.leave(room);
    } else {
      rooms.add(room);
      roomStarted = true;
      console.log(socket.rooms);
    }
  });

  socket.on('newUser', (username) => {
    console.log('newUser recieved')
    console.log('server recieved newUser with username: ' + username);
    adminNamespace.to(room).emit('num-users', 100);
  });

  socket.on('choice', () => {
    if (!roomStarted) return;
    socket.of(playerNamespace).to(room).emit("choiceUpdate", ++choiceCount);
  });

  socket.on('disconnect', () => {
    if (!roomStarted) return;
    console.log(socket.id);
    console.log('room deleted');
    rooms.delete(room);
    console.log(rooms);
  });

});

// User
const playerNamespace = io.of("/player");

playerNamespace.on("connection", socket => {
  socket.on("join-room", (room, username) => {
    if (rooms.has(room)) {
      //not working
      socket.join(room);
      adminNamespace.emit("newUser", username);
      console.log("sucessfully joined room: " + room + " with username: " + username);
      console.log(Object.keys(io.nsps));
    } else {
      console.log("tried to join an unitiated room, username: " + username);
      console.log(rooms);
      console.log(room);
    }
  });
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
});

server.listen(4000, () => {
  console.log('server running on Port 4000');
});
