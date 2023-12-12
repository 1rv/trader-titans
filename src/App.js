import { lazy, Suspense } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import logo from './logo.svg';
import './App.css';

import * as io from 'socket.io-client'
const socket = io.connect("http://localhost:4000");


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
    //start game
  }
  const kickUser = () => {
    //start game
  }

  //States 0 - Default, 1 - admin waiting, 2 - player waiting (w/ name),  3 - player w/o name, 5 - admin playing, 6 - player playing
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
      </>
  } else if (state == 2) {
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
      </>
  }

  // admin left? return to main menu
  if (state === 2 || state === 6 || state === 3) {
    socket.on('roomClosed', () => {
      setState(0);
    });
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>
          {inputs}
          <br></br>
          Play <code>Trader Titans</code>! Enter a game code or start a new game.
        </p>
      </header>
    </div>
  );
}

export default App;
