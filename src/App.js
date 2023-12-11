import { lazy, Suspense } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import logo from './logo.svg';
import './App.css';

import * as io from 'socket.io-client'
const aSocket = io.connect("http://localhost:4000/admin");
const pSocket = io.connect("http://localhost:4000/player");


function App() {
  //admin
  const createRoom = () => {
    aSocket.emit("room-start", code)
    setState(1)
  };
  //player
  const joinRoom = () => {
    setState(3);
  };

  const joinRoomFinal = () => {
    pSocket.emit('join-room', code, username);
  }

  //States 0 - Default, 1 - admin, 2 - player w/ name, 3 - player w/o name
  const [state, setState] = useState(0);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [userCt, setUserCt] = useState(0);

  var inputs;
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
    aSocket.on('num-users', num => {
      setUserCt(num);
    });
    inputs = 
      <>
        {userCt}
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

  return (
    <div className="App">
      <header className="App-header">
        <p>
          {inputs}
          <br></br>
          Edit <code>src/App.js</code> and save to reload.
        </p>
      </header>
    </div>
  );
}

export default App;
