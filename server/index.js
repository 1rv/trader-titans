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
const adminToRoom = {};
const playerToRoom = {};
const roomToAdmin = {};
const roomsData = {};

//want a map [room]-> [admin, users, scores]
io.on("connection", socket => {
  //game/admin components
  socket.on("requestRoom", (room) => {
    socket.join(room)
  });

  //admin
  socket.on("room-start", (room) => {
    let roomData = {
      admin : socket.id,
      usernames : {'' : ''}, //socket.it -> username. We don't want empty username, so ill just make it perma unavailable.
      players : [],
      started : false,
      biddingOpen : false,
      round : 0,
      spread : 0,
      bidAsk : 0,
      marketMaker : ''
    }
    socket.join(room);
    console.log(room);

    io.to(room).emit('Admin connected');
    if (rooms.has(room)) {
      socket.leave(room);
      console.log('room name taken');
    } else {
      io.to(socket.id).emit('roomStartSuccess');
      rooms.add(room);

      //store in server
      adminToRoom[socket.id] = room; 
      roomToAdmin[room] = socket.id;
      roomsData[room] = roomData;

      //console checks
      console.log(roomsData);
      console.log(adminToRoom);
    }
  });

  socket.on('startGame', () => {
    let numPlayers = Object.keys(roomsData[adminToRoom[socket.id]].usernames).length;
    if (numPlayers > 1) {
      room = adminToRoom[socket.id]
      io.to(socket.id).emit('gameStartedAdmin');
      io.to(room).emit('gameStartedPlayer');
      roomsData[room].started = true;
      roomsData[room].round = 1;
    } else {
      console.log('too few players');
    }
  });

  socket.on('choice', () => {
    socket.of(playerNamespace).to(room).emit("choiceUpdate", ++choiceCount);
  });

  socket.on('startBidding', (adminId) => {
    io.to(socket.id).emit('startBiddingAdmin');
    room = adminToRoom[adminId];
    io.to(room).emit('startBiddingPlayer');
    roomsData[room].biddingOpen = true;
    roomsData[room].spread = Number.MAX_SAFE_INTEGER;
  });

  //disconnection logic - both 
  socket.on('disconnect', () => {
    console.log(socket.id);
    if (adminToRoom.hasOwnProperty(socket.id)) {
      //admin - delete room
      console.log('room deleted');
      rooms.delete(adminToRoom[socket.id]);

      //kick all players. 1: tell all to go to main screen 2: disconnect all from room 3: delete room data
      io.to(adminToRoom[socket.id]).emit('roomClosed', adminToRoom[socket.id]);
      io.socketsLeave(adminToRoom[socket.id]);
      delete roomsData[adminToRoom[socket.id]];

      //delete server data
      delete roomToAdmin[adminToRoom[socket.id]];
      delete adminToRoom[socket.id];
      /*
      console.log(roomsData); 
      console.log("deleted roomsData?");
      */
    } else {
      //player - remove username, delete username from room if needed
      room = playerToRoom[socket.id]
      delete playerToRoom[socket.id]
      if (roomsData.hasOwnProperty(room) && roomsData[room]['usernames'].hasOwnProperty(socket.id)) {
        delete roomsData[room].usernames[socket.id]
      }
      console.log(roomsData);
    }
  });

  //player
  socket.on('tryRoom', (room) => {
    if (rooms.has(room)) {
      io.to(socket.id).emit('roomExists');
    }
  })

  socket.on("join-room", (room, username) => {
    console.log(roomsData);
    if (rooms.has(room)) {
      if (Object.values(roomsData[room].usernames).includes(username)) {
        console.log("username taken!");
      } else {
        socket.join(room);
        console.log("sucessfully joined room: " + room + " with username: " + username);
        playerToRoom[socket.id] = room;
        roomsData[room].usernames[socket.id] = username;
        //old implementation
        /*
        usernames[socket.id] = username;
        usernameSet.add(username);
        */ 
        io.to(room).emit("updateUserDisp", Array.from(Object.values(roomsData[room].usernames)));
        io.to(socket.id).emit('joinApproved');
      }
    } else {
      console.log("tried to join an unitiated room, username: " + username); 
      console.log(rooms);
      console.log(room);
    }
  });

  //player game logic things 
  socket.on('bid', (newSpread, username, room) => {
    if (!roomsData[room].biddingOpen || newSpread > (0.9001*roomsData[room].spread)) {
      //bidding closed or bid not small enough, throw a fit
    } else {
      //really we should update admin socketid and only send to that but whatever... Security second
      console.log(username);
      roomsData[room].spread = newSpread;
      roomsData[room].marketMaker = username;
      socket.to(room).emit('bidAccepted', newSpread, username);
    }
  }); 
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
});

server.listen(4000, () => {
  console.log('server running on Port 4000');
});
