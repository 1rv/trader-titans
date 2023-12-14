import { MouseEventHandler } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import styled from 'styled-components';

import * as io from 'socket.io-client';
const socket = io.connect(
  process.env.NODE_ENV === 'production' ? `${process.env.REACT_APP_SERVER_URL}` : 'http://localhost:4000'
);

//import loading circle

export default function Game(props) {
  //0: bidding down spread, 1: setting line, 2: buy/selling, 3: waiting for leaderboard to update
  //props.usn for username
  //props.room for room
  //props.id for old socketid
  //this actually sucks and I should figure out a better way to do this
  const [gameState, setGameState] = useState(3);
  const [bidPrice, setBidPrice] = useState(0);
  const [AskPrice, setAskPrice] = useState(0);
  const [myBidPrice, setMyBidPrice] = useState(NaN);
  const [myAskPrice, setMyAskPrice] = useState(NaN);
  const [score, setScore] = useState(0);
  const [mySpread, setMySpread] = useState('');
  const [officialSpread, setOfficialSpread] = useState(0);
  const [waitingFor, setWaitingFor] = useState('round');
  const [myDiff, setMyDiff] = useState('round');

  socket.emit("requestRoom", props.room);

  const bid = () => {
    if (isNaN(parseInt(mySpread))) return; //entered not a number somehow
    socket.emit('bid', parseInt(mySpread), props.usn, props.room);
  }

  const updateLine = (bidPrice) => {
    let bp = parseInt(bidPrice);
    if (!isNaN(bp)) {
      setMyBidPrice(bp);
      setMyAskPrice(bp+officialSpread);
    }
  }

  const setLine = () => {
    socket.emit('marketMakerSetLine', myBidPrice, myAskPrice, props.room);
  }

  const playerBuy = () => {
    socket.emit('playerTrade', 'buy', props.usn, props.room);
  }
  const playerSell = () => {
    socket.emit('playerTrade', 'buy', props.usn, props.room);
  }

  var display;

  //0: bidding down spread, 1: setting line, 2: buy/selling, 3: waiting for various things, 4: leaderboard
  if (gameState == 0) {
    socket.on('startLineSettingMarketMaker', (spread) => {
      setOfficialSpread(spread);
      setGameState(1);
    });
    socket.on('startLineSettingPlayer', () => {
      setWaitingFor('Market Maker');
      setGameState(3);
    });
    display =
      <>
        <h1>Bid:</h1>
        <input id="newSpread" type="text" placeholder="your bid" autoFocus='true' value={mySpread} onChange={e=> setMySpread(e.target.value)}/>
        <Button variant="primary" onClick = {bid}>Bid</Button>
      </>
  } else if (gameState == 1) {
    //officially the market maker
    //fix this with parseint.
    socket.on('marketMakerLineConfirmed', () => {
      setMyBidPrice(NaN);
      setMyAskPrice(NaN);
      setWaitingFor('traders');
      setGameState(3);
    });
    display = 
      <>
        <h1>{myBidPrice} @ {myAskPrice}</h1>
        <input id="Bid Price" type="text" placeholder="Bid Price" autoFocus='true' onChange={e=> updateLine(e.target.value)}/> 
        <Button variant="primary" onClick = {setLine}>Confirm</Button>
      </>
  } else if (gameState == 2) {
    //buying and selling
    socket.on('tradeRecievedPlayer', () => {
      setWaitingFor('other traders');
      setGameState(3);
    });
    display = 
      <>
        <Button variant="primary" onClick = {playerSell}>Sell</Button>
        <Button variant="primary" onClick = {playerBuy}>Buy</Button>
      </>
  } else if (gameState == 3) {
    //waiting room
    socket.on('startBuySellPlayer', () => {
      setGameState(2);
    });
    socket.on('startBiddingPlayer', () => {
      setGameState(0);
    });
    socket.on('roundResultsPlayer', (usnDiff) => {
      setMyDiff(usnDiff[props.usn]);
      setGameState(4);
    });
    display = 
      <>
        Waiting for {waitingFor}...
      </>;
  } else if (gameState == 4) {
    socket.on('restartRoundPlayer', () => {
      setWaitingFor('round');
      setMyBidPrice(NaN);
      setMyAskPrice(NaN);
      setMySpread('');
      setGameState(3);
    });
    display = 
      <>
        Score Change: {myDiff}
      </>
  }

  return (
    display
  )
}
