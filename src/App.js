import React from 'react';
import { lazy, Suspense } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import logo from './logo.svg';
import './App.css';

//import components
import Rules from './components/rules/rules.js';

import githubIcon from './assets/github-mark.svg';

import * as io from 'socket.io-client'

//import socket
import SocketContext from "./socket";

//lazy load game/admin components
const Game = lazy(() => import('./components/game/game.js'));
const Admin = lazy(() => import('./components/admin/admin.js'));


function App() {
  //socket from context
  const socket = React.useContext(SocketContext);

  //admin
  const createRoom = () => {
    socket.emit("room-start", code, socket.userID)
    socket.on('roomStartSuccess', () => {
      setState(1)
    });
  };
  //player
  const joinRoom = () => {
    socket.emit('tryRoom', code);
    socket.on('roomExists', () => {
      setState(2);
    })
  };

  const joinRoomFinal = () => {
    socket.emit('join-room', code, username, socket.userID);
    socket.on('joinApproved', () => {
      setState(3);
    });
  }
  
  const startGame = () => {
    socket.emit('startGame', socket.userID);
    socket.on('gameStartedAdmin', () => {
      //don't start game if less than 2 players
      setState(4);
    });
  }

  const kickPlayer = (id) => {
    //delete user for innapropriate name or something
    socket.emit('kickPlayer', id);
    console.log('kickPlayer', id);
  }

  let queryServer = false;


  // 0 - landing page/enter code
  // 1 - admin page before game start
  // 2 - trader page enter username
  // 3 - trader page before game start
  // 4 - admin component
  // 5 - trader component
  const [state, setState] = useState(0);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [userDisp, setUserDisp] = useState('');
  const [clientIsBehind, setClientIsBehind] = useState(false);

  socket.on("session", ({sessionID, userID, pageState, clientBehind}) => {
    socket.auth = {sessionID};
    sessionStorage.setItem("sessionID", sessionID);
    socket.userID = userID;
    sessionStorage.setItem("userID", userID);
    console.log("pageState", pageState);
    setState(pageState);
    setClientIsBehind(clientBehind);
  });


  var inputs;
  //states
  if (state === 0) {
    inputs = 
      <>
        <input id="code" type="text" placeholder="type room code" autoFocus='true' value={code} onChange={e=> setCode(e.target.value)}
        />
        <br></br>
        <span class='nowrap'>
        <Button variant="primary" onClick = {joinRoom} >Join Room</Button>
        <Button variant="primary" onClick = {createRoom}>Create Room</Button>
        </span>
        <br></br>
        <p>Play <code>Trader Titans</code>! Enter a game code or start a new game.</p>
      </>
  } else if (state == 1) {
    //admin
    socket.on('updateUserDisp', users => {
      //not a good solution
      //if nothing, do nothing
      if (users.length == 0) {
        setUserDisp();
      }
      //otherwise display all names
      // Create an array of JSX elements for each username
      const userElements = users.map((userData, index) => (
        
        <span 
          key={index} 
          className="underline-on-hover" 
          onClick = {() => kickPlayer(userData[0])}
        > 
          {userData[1]} 
        </span>
      ));
    
      setUserDisp(userElements);
    });
    inputs = 
      <>
        <h1>Game Code: {code}</h1><br></br>
        <h1>Players:</h1><br></br>
        {userDisp}
        <br></br>
        <Button variant="primary" onClick = {startGame}>Start Game</Button>
        <br></br>
      </>
  } else if (state === 2) {
    inputs = 
      <>
        <input id="name" type="text" placeholder="type username" autoFocus='true' value={username}
        onChange={e=> setUsername(e.target.value)}
        />
        <Button variant="primary" onClick = {joinRoomFinal}>Join Room</Button>
        <br></br>
        <p>Play <code>Trader Titans</code>! Enter a game code or start a new game.</p>
      </>
  } else if (state === 3) {
    socket.on('gameStartedPlayer', () => {
      setState(5);
    });
    inputs = 
      <>
        See your name on the board? Get ready to play!
      </>
  } else if (state === 4) {
    inputs = <Suspense fallback = {<p>Loading...</p>}>
      <Admin 
        room={code}
        setRoom={setCode}
        id={socket.userID}
        behind={clientIsBehind}
        setBehind={setClientIsBehind}
      />
    </Suspense>;
  }
  else if (state === 5) {
    inputs = <Suspense fallback = {<p>Loading...</p>}>
      <Game 
        usn={username}
        setUsn={setUsername}
        room={code}
        setRoom={setCode}
        id={socket.userID}
        behind={clientIsBehind}
        setBehind={setClientIsBehind}
      />
    </Suspense>;
  }

  socket.on('kickPlayer', (id) => {
    console.log('kick?', id)
    if (id == socket.userID) {
      setState(0);
    }
  });

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
        <a href="https://github.com/1rv/trader-titans" style={{ position: 'absolute', top: '4%', left: '2%' }}><img src={githubIcon} height='75%' width='75%'/></a>
      </header>
    </div>
  );
}

export default App;
