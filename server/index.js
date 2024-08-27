const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

// Create express app
const app = express();
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://trader-titans-061579df4c4c.herokuapp.com/' : 'http://localhost:3000',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
}));

// Server
const http = require('http');
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
  },
  connctionStateRecovery: {}
});

// maintain a list of active rooms
const rooms = new Set();
const adminToRoom = {};
const playerToRoom = {};
const roomToAdmin = {};
const roomsData = {};

function Player(username, index, score) {
  this.username = username;
  this.index = index;
  this.score = score;
}

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
      usernames : {}, //socket.it -> username. We don't want empty username, so ill just make it perma unavailable.
      usernameToGameId: {},
      leaderboard : [], //array of usernames
      playerTrades : [],
      playerScores : [],
      tradesCt : 0,
      traderCt : 0,
      started : false,
      biddingOpen : false,
      round : 0,
      spread : 0,
      bid : 0,
      ask : 0,
      marketMaker : '',
      marketMakerId : socket.id,
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

      //create user data
      let usernames = Object.values(roomsData[room].usernames)
      for (let i = 0; i < usernames.length; i++) {
        roomsData[room].usernameToGameId[usernames[i]] = i;
        roomsData[room].leaderboard[i] = new Player(usernames[i], i, 0);
      }
      roomsData[room].playerTrades = new Array(usernames.length).fill(0);
      roomsData[room].playerScores = new Array(usernames.length).fill(0);
      roomsData[room].traderCt = usernames.length-1;
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
  socket.on('disconnect', (reason) => {
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
      //check if disconnection is made forced, or if timeout reached on heartbeat
      room = playerToRoom[socket.id]
      delete playerToRoom[socket.id]
      if (roomsData.hasOwnProperty(room) && roomsData[room]['usernames'].hasOwnProperty(socket.id)) {
        delete roomsData[room].usernames[socket.id]
        roomsData[room].traderCt = usernames.length-1;
        console.log("client disconnect: ", roomsData[room].usernames[socket.id]);
      }
      console.log(reason);
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
    if (username == '') return;
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
      roomsData[room].marketMakerId = socket.id;
      io.to(room).emit('bidAccepted', newSpread, username);
    }
  }); 

  socket.on('startLineSetting', (room) => {
    //tell market maker to set
    //tell admin setting has begun
    //tell other players to wait
    //close bidding
    io.to(room).emit('startLineSettingAdmin');
    console.log(roomsData[room].marketMakerId);
    io.to(roomsData[room].marketMakerId).emit('startLineSettingMarketMaker', roomsData[room].spread);
    socket.to(room).except(roomsData[room].marketMakerId).emit('startLineSettingPlayer');
    roomsData[room].biddingOpen = false;
  });

  socket.on('marketMakerSetLine', (bidPrice, askPrice, room) => {
    if(Math.abs((askPrice-bidPrice) - roomsData[room].spread) > (0.001*roomsData[room].spread)) {
      console.log('marketMakerSetLine failed');
      //not confirmed
    } else {
      io.to(roomsData[room].marketMakerId).emit('marketMakerLineConfirmed');
      io.to(room).emit('lineSetAdmin', bidPrice, askPrice);
      socket.broadcast.to(room).emit('startBuySellPlayer', roomsData[room].marketMaker, bidPrice, askPrice);
      roomsData[room].bid = bidPrice;
      roomsData[room].ask = askPrice;
    }
  });

  socket.on('playerTrade', (type, username, room) => {
    //playerTrades : [],
    //playerScores : [],
    //usernameToGameId: {},

    let playerId = roomsData[room].usernameToGameId[username] //index of player
    if (roomsData[room].playerTrades[playerId] != 0) return; //already made a trade! reject it
    if (type == 'buy') {
      roomsData[room].playerTrades[playerId] = 1 //1 - buy
    } else if (type == 'sell') {
      roomsData[room].playerTrades[playerId] = 2 //2 - sell
    } else {
      //something really wrong has happened. Throw an error?
    }
    console.log(type);
    //wildly inefficient to do this, both sending the number of traders out, and sending the msg to everyone instead of just admin
    roomsData[room].tradesCt += 1;
    socket.to(room).emit('tradeRecievedAdmin', roomsData[room].tradesCt, roomsData[room].traderCt);
    io.to(socket.id).emit('tradeRecievedPlayer');
  });

  socket.on('tradingDone', (resolvePrice, room) => {
    let mmId = 0;
    let mmdiff = 0;
    let diffs = new Array(roomsData[room].leaderboard.length).fill(0);
    let buys = 0;
    let sells = 0;
    for (let i = 0; i < roomsData[room].playerTrades.length; i++) { //playerTrades length should be same as leaderboard...
      if (i == roomsData[room].usernameToGameId[roomsData[room].marketMaker]) {
        mmId = i;
      } else if (roomsData[room].playerTrades[i] == 1) { //Buys
        let pnl = resolvePrice - roomsData[room].ask;
        roomsData[room].leaderboard[i].score += pnl;
        //may not need this next line
        roomsData[room].playerScores[i] += pnl;
        mmdiff -= pnl;
        buys += 1;
        diffs[i] = pnl;
      } else if (roomsData[room].playerTrades[i] == 2) { //Sells
        let pnl = roomsData[room].bid - resolvePrice;
        roomsData[room].leaderboard[i].score += pnl;
        //may not need this next line
        roomsData[room].playerScores[i] += (pnl);
        mmdiff -= pnl;
        diffs[i] = pnl;
        sells += 1;
      } else {
        //didn't play... lose 5%
        roomsData[room].leaderboard[i].score -= (roomsData[room].spread*0.05);
        roomsData[room].playerScores[i] -= (roomsData[room].spread*0.05);
        diffs[i] = (-1)*roomsData[room].spread*0.05;
      }
    }
    roomsData[room].leaderboard[mmId].score += mmdiff;
    roomsData[room].playerScores[mmId] += mmdiff;
    diffs[mmId] = mmdiff;

    //create stuff for admin/players
    let usnDiff = {}
    let usnScores = {}
    for (const usn of Object.values(roomsData[room].usernames)) {
      usnDiff[usn] = diffs[roomsData[room].usernameToGameId[usn]];
    }

    let topFive = [...roomsData[room].leaderboard];
    topFive.sort((p1, p2) => p2.score - p1.score);

    //change these to be to the room
    io.to(room).emit('roundResultsPlayer', usnDiff);
    socket.emit('roundResultsAdmin', topFive.slice(0, Math.min(topFive.length, 5)), [buys, sells, mmdiff]);
    console.log(topFive.slice(0, Math.min(topFive.length, 5)));
  });

  socket.on('restartRound', (room) => {
    //change variables
    let n = roomsData[room].leaderboard.length
    roomsData[room].playerTrades = new Array(n).fill(0);
    roomsData[room].playerScores = new Array(n).fill(0);
    roomsData[room].round += 1;
    roomsData[room].marketMaker = '';
    roomsData[room].tradesCt = 0;

    //emit to users
    io.to(socket.id).emit('restartRoundAdmin');
    io.to(room).emit('restartRoundPlayer');
  });
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
});

server.listen(process.env.PORT || 4000, () => {
  console.log('server running');
});
