import React from 'react';
import { lazy, Suspense } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import logo from './logo.svg';
import './App.css';

//import components
import Rules from './components/rules/rules.js';
import Game from './components/game/game.js';
import Admin from './components/admin/admin.js';


//server

import * as io from 'socket.io-client'
const socket = io.connect(
  process.env.NODE_ENV === 'production' ? `${process.env.REACT_APP_SERVER_URL}` : 'http://localhost:4000'
);



function App() {
  //admin
  const createRoom = () => {
    socket.emit("room-start", code)
    socket.on('roomStartSuccess', () => {
      setState(1)
    });
  };
  //player
  const joinRoom = () => {
    socket.emit('tryRoom', code);
    socket.on('roomExists', () => {
      setState(3);
    })
  };

  const joinRoomFinal = () => {
    socket.emit('join-room', code, username);
    socket.on('joinApproved', () => {
      setState(2);
    });
  }
  
  const startGame = () => {
    socket.emit('startGame');
    socket.on('gameStartedAdmin', () => {
      //don't start game if less than 2 players
      setState(5);
    });
  }

  //implement this
  const kickUser = () => {
    //delete user for innapropriate name or something
  }

  //States 0 - Default, 1 - admin waiting, 2 - player waiting (w/ name),  3 - player w/o name, 5 - admin playing, 6 - player playing (tightening), 7 - player playing (setting line), 8 - player playing (buy/sell)
  const [state, setState] = useState(0);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [userDisp, setUserDisp] = useState('');

  var inputs;
  //states
  if (state == 0) {
    inputs = 
      <>
        <input id="code" type="text" placeholder="type room code" autoFocus='true' value={code} onChange={e=> setCode(e.target.value)}
        />
        <br></br>
        <Button variant="primary" onClick = {joinRoom}>Join Room</Button>
        <Button variant="primary" onClick = {createRoom}>Create Room</Button>
        <br></br>
        <p>Play <code>Trader Titans</code>! Enter a game code or start a new game.</p>
      </>
  } else if (state == 1) {
    //admin
    socket.on('updateUserDisp', users => {
      //not a good solution
      //if nothing, do nothing
      if (users.length == 0) return;
      //otherwise display all names
      let disp = '';

      for (const username of users) {
        disp += username + ' '
      }
      setUserDisp(disp);
    });
    inputs = 
      <>
        <h1>Players:</h1><br></br>
        {userDisp}
        <br></br>
        <Button variant="primary" onClick = {startGame}>Start Game</Button>
        <br></br>
        <p>Play <code>Trader Titans</code>! Enter a game code or start a new game.</p>
      </>
  } else if (state == 2) {
    socket.on('gameStartedPlayer', () => {
      setState(6);
    });
    inputs = 
      <>
        See your name on the board? Get ready to play!
      </>
  } else if (state == 3) {
    inputs = 
      <>
        <input id="name" type="text" placeholder="type username" autoFocus='true' value={username}
        onChange={e=> setUsername(e.target.value)}
        />
        <Button variant="primary" onClick = {joinRoomFinal}>Join Room</Button>
        <br></br>
        <p>Play <code>Trader Titans</code>! Enter a game code or start a new game.</p>
      </>
  } else if (state === 5) {
    //write better viariables. Find also a non bad solution for these guys
    let a = <Admin />;
    const a1 = React.cloneElement(a, {
      id : socket.id,
      room : code 
    })
    inputs = a1;
  }
  else if (state === 6) {
    let g = <Game />;
    const g1 = React.cloneElement(g, {
      usn : username,
      room : code,
      id : socket.id
    });
    inputs = g1;
  }

  // admin left? return to main menu
  if (state === 2 || state === 6  || state === 3) {
    socket.on('roomClosed', () => {
      setState(0);
    });
  }

  return (
    <div className="App">
      <header className="App-header">
          {inputs}
        <Rules/>
      </header>
    </div>
  );
}

export default App;
