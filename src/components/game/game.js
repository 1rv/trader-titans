import { MouseEventHandler } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import styled from 'styled-components';

import * as io from 'socket.io-client';
const socket = io.connect("http://localhost:4000");

//import loading circle

export default function Game(props) {
  //0: bidding down spread, 1: setting line, 2: buy/selling, 3: waiting for leaderboard to update
  //props.usn for username
  //props.room for room
  //props.id for old socketid
  //this actually sucks and I should figure out a better way to do this
  const [gameState, setGameState] = useState(3);
  const [buyPrice, setBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [score, setScore] = useState(0);
  const [mySpread, setMySpread] = useState('');

  socket.emit("requestRoom", props.room);

  const bid = () => {
    if (isNaN(parseInt(mySpread))) return; //entered not a number somehow
    socket.emit('bid', parseInt(mySpread), props.usn, props.room);
  }

  var display;

  if (gameState == 0) {
    display =
      <>
        <h1>Bid:</h1>
        <input id="newSpread" type="text" placeholder="newSpread" autoFocus='true' value={mySpread} onChange={e=> setMySpread(e.target.value)}/>
        <Button variant="primary" onClick = {bid}>Bid</Button>
      </>
  } else if (gameState == 1) {

  } else if (gameState == 2) {

  } else if (gameState == 3) {
    socket.on('startBiddingPlayer', () => {
      console.log('set');
      setGameState(0);
    });
    display = 
      <>
        Waiting for round...
      </>;
  }

  return (
    display
  )
}
