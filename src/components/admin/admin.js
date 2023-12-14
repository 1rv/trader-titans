import { MouseEventHandler } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import styled from 'styled-components';

import * as io from 'socket.io-client';
const socket = io.connect(
  process.env.NODE_ENV === 'production' ? `${process.env.REACT_APP_SERVER_URL}` : 'http://localhost:4000'
);

//import loading circle

export default function Admin(props) {
  //0: setting topic/start round, 1: waiting for bidding, 2: waiting for players to setline/trade, 3: resolving price, 4: leaderboard
  //access admin's socketid with props.id
  //props.room for old room
  const [adminState, setAdminState] = useState(0);
  const [bidPrice, setBidPrice] = useState(0);
  const [askPrice, setAskPrice] = useState(0);
  const [topic, setTopic] = useState(''); //local
  const [marketMaker, setMarketMaker] = useState('');
  const [spread, setSpread] = useState(Number.MAX_SAFE_INTEGER);
  const [waitingFor, setWaitingFor] = useState('');
  const [marketString, setMarketString] = useState('');
  const [traderString, setTraderString] = useState('');
  const [resolvePrice, setResolvePrice] = useState('');
  const [topFive, setTopFive] = useState([]);
  const [roundStats, setRoundStats] = useState([]); //[buys, sells, mmPnL]
  
  socket.emit("requestRoom", props.room);

  const startBidding = () => {
    socket.emit('startBidding', props.id);
    socket.on('startBiddingAdmin', () => {
      setAdminState(1);
    });
  }

  //update this to call+response later
  const startLineSetting = () => {
    socket.emit('startLineSetting', props.room);
    socket.on('startLineSettingAdmin', () => {
      setWaitingFor('Waiting for Market Maker...');
      setAdminState(2);
    });
  }

  const tradingDone = () => {
    let rp = parseInt(resolvePrice);
    if (!isNaN(rp)) {
      socket.emit('tradingDone', rp, props.room);
    }
  }

  const restartRound = () => {
    socket.emit('restartRound', props.room);
  }


  var display;

  //0: setting topic/start round, 1: waiting for bidding, 2: waiting for players to setline/trade, 3: resolving price, 4: leaderboard
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
        <h1>Topic: {topic}</h1>
        <h1>Spread: <code>{spread}</code></h1>
        <h1>By: <code>{marketMaker}</code></h1>
        <Button variant='primary' onClick = {startLineSetting}>Confirm Market Maker</Button>
      </>
  } else if (adminState == 2) {
    socket.on('lineSetAdmin', (bid, ask) => {
      setBidPrice(bid);
      setAskPrice(ask);
      setWaitingFor('Waiting for Traders...');
      setMarketString("Market: "+ String(bid)+ "@" + String(ask));
    });
    socket.on('tradeRecievedAdmin', (tradesCt, traderCt) => {
      setTraderString(tradesCt + " out of " + traderCt + " trades processed");
    });
    socket.on('roundResultsAdmin', (topFive, roundStats) => {
      setTopFive(topFive);
      setRoundStats(roundStats);
      setAdminState(4);
    });
    display = 
      <>
        <h1>Topic: {topic}</h1>
        <h1>{waitingFor}</h1>
        <h2>{marketString}</h2>
        <h2>{traderString}</h2>
        <input id="Resolve Price" type="text" placeholder="Resolve Price" autoFocus='true' onChange={e=> setResolvePrice(e.target.value)}/> 
        <Button variant="primary" onClick = {tradingDone}>Resolve</Button>
      </>
  } else if (adminState == 3) {
    display = 
      <>
        Waiting for trades to resolve... this shouldnt happen
      </>
  } else if (adminState == 4) {
    socket.on('restartRoundAdmin', () => {
      setTopic('');
      setMarketMaker('');
      setSpread(Number.MAX_SAFE_INTEGER);
      setAdminState(0);
      setTraderString('');
      setMarketString('')
    });
    //there must be a better way of doing this
    let n = topFive.length;
    if (n == 2) {
      display =
        <>
          <h1>Leaderboard</h1>
          {topFive[0].username}:  {topFive[0].score}
          <br></br>
          {topFive[1].username}:  {topFive[1].score}
          <br></br>
          <br></br>
          <h2>Round Stats:</h2>
          buys: {roundStats[0]}
          <br></br>
          sells: {roundStats[1]}
          <br></br>
          Market Maker ({marketMaker}) PnL: {roundStats[2]}
          <br></br>
          <Button variant="primary" onClick = {restartRound}>Next Round</Button>
        </>
    } else if (n == 3) {
      display =
        <>
          <h1>Leaderboard</h1>
          {topFive[0].username}:  {topFive[0].score}
          <br></br>
          {topFive[1].username}:  {topFive[1].score}
          <br></br>
          {topFive[2].username}:  {topFive[2].score}
          <br></br>
          <br></br>
          <h2>Round Stats:</h2>
          buys: {roundStats[0]}
          <br></br>
          sells: {roundStats[1]}
          <br></br>
          Market Maker ({marketMaker}) PnL: {roundStats[2]}
          <br></br>
          <Button variant="primary" onClick = {restartRound}>Next Round</Button>
        </>
    } else if (n == 4) {
      display =
        <>
          <h1>Leaderboard</h1>
          {topFive[0].username}:  {topFive[0].score}
          <br></br>
          {topFive[1].username}:  {topFive[1].score}
          <br></br>
          {topFive[2].username}:  {topFive[2].score}
          <br></br>
          {topFive[3].username}:  {topFive[3].score}
          <br></br>
          <br></br>
          <h2>Round Stats:</h2>
          buys: {roundStats[0]}
          <br></br>
          sells: {roundStats[1]}
          <br></br>
          Market Maker ({marketMaker}) PnL: {roundStats[2]}
          <br></br>
          <Button variant="primary" onClick = {restartRound}>Next Round</Button>
        </>
    } else {
      display =
        <>
          <h1>Leaderboard</h1>
          {topFive[0].username}:  {topFive[0].score}
          <br></br>
          {topFive[1].username}:  {topFive[1].score}
          <br></br>
          {topFive[2].username}:  {topFive[2].score}
          <br></br>
          {topFive[3].username}:  {topFive[3].score}
          <br></br>
          {topFive[4].username}:  {topFive[4].score}
          <br></br>
          <br></br>
          <h2>Round Stats:</h2>
          buys: {roundStats[0]}
          <br></br>
          sells: {roundStats[1]}
          <br></br>
          Market Maker ({marketMaker}) PnL: {roundStats[2]}
          <br></br>
          <Button variant="primary" onClick = {restartRound}>Next Round</Button>
        </>
    }
  }

  return (
    display
  )
}
