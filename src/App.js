import React from 'react';
import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';

//import logo from './logo.svg';
import './App.css';

//import components
import Rules from './components/rules/rules.js';

import githubIcon from './assets/github-mark.svg';

//import socket
import SocketContext from "./socket";

//import notifs
import toast, { Toaster } from 'react-hot-toast';

//lazy load game/admin components
//const Game = lazy(() => import('./components/game/game.js'));
//const Admin = lazy(() => import('./components/admin/admin.js'));
import Game from './components/game/game.js';
import Admin from './components/admin/admin.js';


function App() {
  //socket from context
  const socket = React.useContext(SocketContext);

  //states
  const [state, setState] = useState(0);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [userDisp, setUserDisp] = useState('');
  const [clientIsBehind, setClientIsBehind] = useState(false);

  
  //admin
  const createRoom = () => {
    if(code.length === 0) {
      toast.error('room code cannot be empty');
      return;
    }
    socket.emit("room-start", code, socket.userID)
    //socket.on('roomStartSuccess', () => {
    //  setState(1)
    //});
  };
  //player
  const joinRoom = () => {
    socket.emit('tryRoom', code);
    //socket.on('roomExists', () => {
    //  setState(2);
    //})
  };

  const joinRoomFinal = () => {
    socket.emit('join-room', code, username, socket.userID);
    //socket.on('joinApproved', () => {
    //  setState(3);
    //});
  }
  
  const startGame = () => {
    socket.emit('startGame', socket.userID);
    //socket.on('gameStartedAdmin', () => {
    //  //don't start game if less than 2 players
    //  setState(4);
    //});
  }


  // 0 - landing page/enter code
  // 1 - admin page before game start
  // 2 - trader page enter username
  // 3 - trader page before game start
  // 4 - admin component
  // 5 - trader component
  useEffect(() => {
    //app state changes
    socket.on('roomStartSuccess', () => {
      setState(1)
    });
    socket.on('roomExists', () => {
      setState(2);
    })
    socket.on('joinApproved', () => {
      setState(3);
    });
    socket.on('gameStartedAdmin', () => {
      //don't start game if less than 2 players
      setState(4);
    });

    socket.on('gameAlreadyStarted', () => {
      toast.error('game already started');
    });

    //heartbeat
    socket.on('heartbeat', () => {
      socket.emit('heartbeatResponse', socket.userID);
      console.log('hearbeatResponse');
      console.log(socket.userID);
    });

    //persistent state
    socket.on("session", ({sessionID, userID, pageState, clientBehind}) => {
      console.log(userID);
      socket.auth = {sessionID};
      sessionStorage.setItem("sessionID", sessionID);
      socket.userID = userID;
      sessionStorage.setItem("userID", userID);
      setState(pageState);
      setClientIsBehind(clientBehind);



      if(pageState === 1) {
        socket.emit('getAdminData', userID);
      }
    });

    socket.on('giveAdminData', ({code, users}) => {
      setCode(code);
      setUserDisp(constructUserList(users));
    });

    socket.on('kickPlayer', (id) => {
      if (id === socket.userID) {
        setState(0);
        toast.error('you have been kicked');
      }
    });

    //errors
    socket.on('roomNameTaken', () => {
      toast.error('room name taken!');
    });

    socket.on('usernameTaken', () => {
      toast.error('username taken!');
    });

    socket.on('noSuchRoom', () => {
      toast.error('room does not exist');
    });

    // admin left? return to main menu
    socket.on('roomClosed', () => {
      setState(0);
      toast.error('admin left, room closed');
    });

    socket.on('tooFewPlayersToStart', () => {
      toast.error('need at least 2 players to start');
    });
    
    socket.on('updateUserDisp', users => {
      setUserDisp(constructUserList(users));
    });

    socket.on('gameStartedPlayer', () => {
      setState(5);
    });

    function constructUserList(users) {
      if(users.length === 0) {
        return;
      }
      const userElements = users.map((userData, index) => (
        <span 
          key={index} 
          class="underline-on-hover" 
          onClick = {() => kickPlayer(userData[0])}
        > 
          {userData[1]} 
        </span>
      ));
      return userElements
    }

    const kickPlayer = (id) => {
      //delete user for innapropriate name or something
      socket.emit('kickPlayer', id);
      console.log('kickPlayer', id);
    }
  }, [socket]);


  var inputs;
  //states
  if (state === 0) {
    inputs = 
      <>
        <input id="code" type="text" placeholder="type room code" autoFocus='true' 
          value={code} onChange={e=>setCode(e.target.value)}
          maxLength="10"
        />
        <br></br>
        <span class='nowrap'>
        <Button variant="primary" onClick = {joinRoom} >Join Room</Button>
        <Button variant="primary" onClick = {createRoom}>Create Room</Button>
        </span>
        <br></br>
        <p>Play <code>Trader Titans</code>! Enter a game code or start a new game.</p>
      </>
  } else if (state === 1) {
    //admin
    //socket.on('updateUserDisp', users => {
    //  setUserDisp(constructUserList(users));
    //});

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
          maxlength="15"
        />
        <Button variant="primary" onClick = {joinRoomFinal}>Join Room</Button>
        <br></br>
        <p>Play <code>Trader Titans</code>! Enter a game code or start a new game.</p>
      </>
  } else if (state === 3) {
    //socket.on('gameStartedPlayer', () => {
    //  setState(5);
    //});
    inputs = 
      <>
        See your name on the board? Get ready to play!
      </>
  } else if (state === 4) {
    inputs =
      <Admin 
        room={code}
        setRoom={setCode}
        id={socket.userID}
        behind={clientIsBehind}
        setBehind={setClientIsBehind}
      />;
  }
  else if (state === 5) {
    inputs =
      <Game 
        usn={username}
        setUsn={setUsername}
        room={code}
        setRoom={setCode}
        id={socket.userID}
        behind={clientIsBehind}
        setBehind={setClientIsBehind}
      />;
  }


  return (
    <div class="App">
      <header class="App-header">
        <Toaster
          toastOptions = {{
            error: {
              duration: 1500,
              style: {
                background: '#bf616a',
                color: '#eceff4',
              },
            },
            success: {
              duration: 1500,
              style: {
                background: '#a3be8c',
                color: '#eceff4',
              }
            }
          }}
        />
        {inputs}
        <Rules/>
        <a href="https://github.com/1rv/trader-titans" style={{ position: 'absolute', top: '4%', left: '2%' }}><img src={githubIcon} alt = "github" height='75%' width='75%'/></a>
      </header>
    </div>
  );
}

export default App;
