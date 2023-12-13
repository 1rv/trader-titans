import { MouseEventHandler } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import styled from 'styled-components';

import * as io from 'socket.io-client';
const socket = io.connect("http://localhost:4000");

//import loading circle

export default function Admin(props) {
  //0: setting topic/start round, 1: waiting for bidding, 2: waiting for players to trade, 3: resolving price, 4: leaderboard
  //access admin's socketid with props.id
  //props.room for old room
  const [adminState, setAdminState] = useState(0);
  const [buyPrice, setBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [resolvePrice, setResolvePrice] = useState(0);
  const [topic, setTopic] = useState(''); //local
  const [marketMaker, setMarketMaker] = useState('');
  const [spread, setSpread] = useState(Number.MAX_SAFE_INTEGER);
  
  socket.emit("requestRoom", props.room);

  const startBidding = () => {
    socket.emit('startBidding', props.id);
    socket.on('startBiddingAdmin', () => {
      setAdminState(1);
    });
  }


  var display;

  if (adminState == 0) {
    display = 
      <>
        <h1>Topic:</h1>
        <input id="topic" type="text" placeholder="topic" autoFocus='true' value={topic} onChange={e=> setTopic(e.target.value)}/>
        <Button variant="primary" onClick = {startBidding}>Start Bidding</Button>
      </>
  } else if (adminState == 1) {
    socket.on('bidAccepted', (newSpread, username) => {
      console.log('gotbidaccepted');
      setMarketMaker(username);
      setSpread(newSpread);
    });
    display = 
      <>
        <h1>Spread: <code>{spread}</code></h1>
        <h1>By: <code>{marketMaker}</code></h1>
      </>
  } else if (adminState == 2) {
    display = 
      <>
        adminState2
      </>
  } else if (adminState == 3) {
    display = 
      <>
        adminState3
      </>
  } else if (adminState == 4) {
    display = 
      <>
        adminState4
      </>
  }

  return (
    display
  )
}
