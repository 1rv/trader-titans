import { MouseEventHandler } from 'react';
import { useState } from 'react';

import styled from 'styled-components';

import * as io from 'socket.io-client';
const socket = io.connect("http://localhost:4000");

//import loading circle

export default function Admin() {
  //0: setting topic/start round, 1: waiting for line, 2: waiting for players to trade, 3: resolving price, 4: leaderboard
  const [adminState, setAdminState] = useState(3);
  const [buyPrice, setBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [resolvePrice, setResolvePrice] = useState(0);

  var display;

  if (adminState == 0) {
    display = 
      <>
        Waiting for round...
      </>
  } else if (adminState == 1) {

  } else if (adminState == 2) {

  } else if (adminState == 3) {

  } else if (adminState == 4) {

  }

  return (
    display
  )
}
