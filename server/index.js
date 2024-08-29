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

const crypto = require("crypto");
const randomId = () => crypto.randomBytes(16).toString('hex');

const { InMemorySessionStore } = require("./sessionStore");
const sessionStore = new InMemorySessionStore();


const io = new Server(server, {
  cors: {
    origin: "*",
  },
  connctionStateRecovery: {}
});

// session state
io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      return next();
    }
  }
  socket.sessionID = randomId();
  socket.userID = randomId();
  next();
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
  socket.join(socket.userID);
  //emit session persist
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
  });

  let inferredState = 0;
  let possibleClientBehind = false;
  adminRoom = adminToRoom[socket.userID];
  if (adminRoom) {
    socket.join(adminRoom);
    if (roomsData[adminRoom].started) {
      inferredState = 4;
      possibleClientBehind = true;
    } else {
      inferredState = 1;
    }
  } else {
    playerRoom = playerToRoom[socket.userID];
    if (playerRoom) {
      socket.join(playerRoom);
      if (roomsData[playerRoom].started) {
        inferredState = 5;
        possibleClientBehind = true;
      } else {
        inferredState = 3;
      }
    }
  }

  console.log("inferredState after calculation", inferredState);
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
    pageState: inferredState,
    clientBehind: possibleClientBehind,
  });

  
  //join the room of your sessionID
  socket.on("requestRoom", (room) => {
    socket.join(room)
  });

  //admin
  socket.on("room-start", (room, userID) => {
    let roomData = {
      admin : userID,
      usernames : {}, //userID -> username. We don't want empty username, so ill just make it perma unavailable.
      usernameToGameId: {},
      leaderboard : [], //array of usernames
      playerTrades : [],
      playerRoundScores : [],
      playerScores : [], // userID -> score
      tradesCt : 0,
      traderCt : 0,
      started : false,
      biddingOpen : false,
      round : 0,
      spread : 0,
      bid : 0,
      ask : 0,
      marketMaker : '',
      marketMakerId : userID,
      gameState : 'setting-topic', //'setting-topic', 'bidding-down-spread', 
                                  //'market-maker-setting-line', 'trading', 'round-stats'
    }
    socket.join(room);

    io.to(room).emit('Admin connected');
    if (rooms.has(room)) {
      socket.leave(room);
      console.log('room name taken');
    } else {
      io.to(socket.id).emit('roomStartSuccess');
      rooms.add(room);

      //store in server
      adminToRoom[userID] = room; 
      roomToAdmin[room] = userID;
      roomsData[room] = roomData;

    }
  });

  socket.on('startGame', (adminUserID) => {
    let numPlayers = Object.keys(roomsData[adminToRoom[adminUserID]].usernames).length;
    if (numPlayers > 1) {
      room = adminToRoom[adminUserID]
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
      roomsData[room].playerRoundScores = new Array(usernames.length).fill(0);
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
    roomsData[room].gameState = 'bidding-down-spread';
    roomsData[room].biddingOpen = true;
    roomsData[room].spread = Number.MAX_SAFE_INTEGER;
  });

  //disconnection logic - both 
  socket.on('disconnect', (reason) => {
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
    } else {
      //player - remove username, delete username from room if needed
      //I suspect mobile clients are disconnecting due to transport problems - in this case do not remove
      if(reason !== "transport close" || reason !== "transport error") {
        room = playerToRoom[socket.id]
        delete playerToRoom[socket.id]
        if (roomsData.hasOwnProperty(room) && roomsData[room]['usernames'].hasOwnProperty(socket.id)) {
          delete roomsData[room].usernames[socket.id]
          roomsData[room].traderCt = usernames.length-1;
          console.log("client disconnect: ", roomsData[room].usernames[socket.id]);
        }
      }
    }
  });


  //player
  socket.on('tryRoom', (room) => {
    if (rooms.has(room)) {
      io.to(socket.id).emit('roomExists');
    }
  })

  socket.on("join-room", (room, username, userID) => {
    if (username === '') return;
    if (rooms.has(room)) {
      if (Object.values(roomsData[room].usernames).includes(username)) {
        console.log("username taken!");
      } else {
        socket.join(room);
        console.log("sucessfully joined room: " + room + " with username: " + username);

        playerToRoom[userID] = room;
        roomsData[room].usernames[userID] = username;

        io.to(room).emit("updateUserDisp", Array.from(Object.entries(roomsData[room].usernames)));
        io.to(socket.id).emit('joinApproved');
      }
    } else {
      console.log("tried to join an unitiated room, username: " + username); 
      console.log(rooms);
      console.log(room);
    }
  });

  //player game logic things 
  socket.on('bid', (newSpread, username, room, userID) => {
    if (!roomsData[room].biddingOpen || newSpread > (0.9001*roomsData[room].spread)) {
      //bidding closed or bid not small enough, throw a fit
    } else {
      //really we should update admin socketid and only send to that but whatever... Security second
      roomsData[room].spread = newSpread;
      roomsData[room].marketMaker = username;
      roomsData[room].marketMakerId = userID;
      io.to(room).emit('bidAccepted', newSpread, username);
    }
  }); 

  socket.on('startLineSetting', (room) => {
    //tell market maker to set
    //tell admin setting has begun
    //tell other players to wait
    //close bidding
    mmID = roomsData[room].marketMakerId;

    io.to(room).emit('startLineSettingAdmin');
    io.to(roomsData[room].marketMakerId).emit('startLineSettingMarketMaker', roomsData[room].spread);
    socket.to(room).emit('startLineSettingPlayer', mmID);
    roomsData[room].biddingOpen = false;
    roomsData[room].gameState = 'market-maker-setting-line';
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
      roomsData[room].gameState = 'trading';
    }
  });

  socket.on('playerTrade', (type, username, room) => {
    //playerTrades : [],
    //playerRoundScores : [],
    //usernameToGameId: {},

    let playerId = roomsData[room].usernameToGameId[username] //index of player
    if (roomsData[room].playerTrades[playerId] != 0) return; //already made a trade! reject it
    if (type === 'buy') {
      roomsData[room].playerTrades[playerId] = 1 //1 - buy
    } else if (type === 'sell') {
      roomsData[room].playerTrades[playerId] = 2 //2 - sell
    } else {
      //something really wrong has happened. Throw an error?
    }
    //wildly inefficient to do this, both sending the number of traders out, and sending the msg to everyone instead of just admin
    roomsData[room].tradesCt += 1;
    socket.to(room).emit('tradeRecievedAdmin', roomsData[room].tradesCt, roomsData[room].traderCt);
    io.to(socket.id).emit('tradeRecievedPlayer');
  });

  socket.on('tradingDone', (resolvePrice, room) => {
    let mmIndex = 0;
    let mmdiff = 0;
    let diffs = new Array(roomsData[room].leaderboard.length).fill(0);
    let buys = 0;
    let sells = 0;
    for (let i = 0; i < roomsData[room].playerTrades.length; i++) { //playerTrades length should be same as leaderboard...
      if (i === roomsData[room].usernameToGameId[roomsData[room].marketMaker]) {
        mmIndex = i;
      } else if (roomsData[room].playerTrades[i] === 1) { //Buys
        let pnl = resolvePrice - roomsData[room].ask;
        roomsData[room].leaderboard[i].score += pnl;
        //may not need this next line
        roomsData[room].playerRoundScores[i] += pnl;
        roomsData[room].playerScores[i] += pnl;
        mmdiff -= pnl;
        buys += 1;
        diffs[i] = pnl;
      } else if (roomsData[room].playerTrades[i] === 2) { //Sells
        let pnl = roomsData[room].bid - resolvePrice;
        roomsData[room].leaderboard[i].score += pnl;
        //may not need this next line
        roomsData[room].playerRoundScores[i] += (pnl);
        roomsData[room].playerScores[i] += pnl;
        mmdiff -= pnl;
        diffs[i] = pnl;
        sells += 1;
      } else {
        //didn't play... lose 10%
        roomsData[room].leaderboard[i].score -= (roomsData[room].spread*0.1);
        roomsData[room].playerRoundScores[i] -= (roomsData[room].spread*0.1);
        diffs[i] = (-1)*roomsData[room].spread*0.05;
      }
    }
    roomsData[room].leaderboard[mmIndex].score += mmdiff;
    roomsData[room].playerRoundScores[mmIndex] += mmdiff;
    roomsData[room].playerRoundScores[mmIndex] += mmdiff;
    roomsData[room].playerScores[mmIndex] += mmdiff;
    diffs[mmIndex] = mmdiff;

    //create stuff for admin/players
    let usnDiff = {}
    let usnScores = {}
    for (const usn of Object.values(roomsData[room].usernames)) {
      usnDiff[usn] = diffs[roomsData[room].usernameToGameId[usn]];
    }

    let topFive = [...roomsData[room].leaderboard];
    topFive.sort((p1, p2) => p2.score - p1.score);

    roomsData[room].gameState = 'round-stats';

    //change these to be to the room
    io.to(room).emit('roundResultsPlayer', usnDiff);
    socket.emit('roundResultsAdmin', topFive.slice(0, Math.min(topFive.length, 5)), [buys, sells, mmdiff]);
    console.log(topFive.slice(0, Math.min(topFive.length, 5)));
  });

  socket.on('restartRound', (room) => {
    //change variables
    let n = roomsData[room].leaderboard.length
    roomsData[room].playerTrades = new Array(n).fill(0);
    roomsData[room].playerRoundScores = new Array(n).fill(0);
    roomsData[room].round += 1;
    roomsData[room].marketMaker = '';
    roomsData[room].tradesCt = 0;

    //emit to users
    io.to(socket.id).emit('restartRoundAdmin');
    io.to(room).emit('restartRoundPlayer');
  });

  //round management
  socket.on('kickPlayer', (id) => {
    room = playerToRoom[id]
    delete playerToRoom[id]
    if (roomsData.hasOwnProperty(room) && roomsData[room]['usernames'].hasOwnProperty(id)) {
      delete roomsData[room].usernames[id];
      roomsData[room].traderCt -= 1;
    }
    io.to(room).emit('kickPlayer', id);
    io.to(room).emit("updateUserDisp", Array.from(Object.entries(roomsData[room].usernames)));
  });


  //various intermediate queries
  socket.on('getScoreBoardData', (userID) => {
    room = playerToRoom[userID];
    usn = roomsData[room].usernames[userID];
    index = roomsData[room].usernameToGameId[usn];
    scr = roomsData[room].playerScores[index];
    io.to(userID).emit("scoreBoardData", {
      username: usn,
      score: scr,
    });
  });

  socket.on('getGameData', (userID) => {
    room = playerToRoom[userID];
    usn = roomsData[room].usernames[userID];
    index = roomsData[room].usernameToGameId[usn];
    state = roomsData[room].gameState;

    const gameData = {};
    
    gameData.state = state;
    gameData.isAdmin = roomsData[room].admin === userID;
    gameData.room = room;
    //'setting-topic', 'bidding-down-spread', 
    //'market-maker-setting-line', 'trading', 'round-stats'
    if(!gameData.isAdmin) {
      //player
      switch (state) {
        case 'setting-topic':
          break;
        case 'bidding-down-spread':
          break;
        case 'market-maker-setting-line':
          gameData.isMarketMaker = roomsData[room].marketMakerId === userID;
          if(gameData.isMarketMaker) {
            gameData.spreadWidth = roomsData[room].spread;
          }
        case 'trading':
          if(!gameData.isMarketMaker) {
            gameData.alreadyTraded = roomsData[room].playerTrades[index] !== 0;
            gameData.bidPrice = roomsData[room].bid;
            gameData.askPrice = roomsData[room].ask;
          }
          break;
        case 'round-stats':
          gameData.scoreChange = roomsData[room].playerRoundScores[index];
          break;
      }
    }
    console.log('giveGameData', gameData, userID);
    io.to(socket.id).emit('giveGameData', gameData);
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log('server running');
});
