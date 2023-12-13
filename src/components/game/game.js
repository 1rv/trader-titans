import { MouseEventHandler } from 'react';
import { useState } from 'react';

import styled from 'styled-components';

import * as io from 'socket.io-client';
const socket = io.connect("http://localhost:4000");

//import loading circle

export default function Game() {
  //0: bidding down spread, 1: setting line, 2: buy/selling, 3: waiting for leaderboard to update
  const [gameState, setGameState] = useState(3);
  const [buyPrice, setBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [score, setScore] = useState(0);

  var display;

  if (gameState == 0) {

  } else if (gameState == 1) {

  } else if (gameState == 2) {

  } else if (gameState == 3) {
    display = 
      <>
        Waiting for round...
      </>
  }

  return (
    display
  )
}
