import { useState , useEffect} from 'react';
import Button from 'react-bootstrap/Button';
import React from 'react';

import Scorebar from '../scorebar/scorebar.js';

import * as io from 'socket.io-client';
import SocketContext from "../../socket";
const socket = io.connect(
  process.env.NODE_ENV === 'production' ? `${process.env.REACT_APP_SERVER_URL}` : 'http://localhost:4000'
);


//import loading circle

export default function Game(props) {
  //get socket
  const socket = React.useContext(SocketContext);
  
  //0: bidding down spread, 1: setting line, 2: buy/selling, 3: waiting for leaderboard to update
  //props.usn for username
  //props.room for room
  //props.id for old socketid
  //this actually sucks and I should figure out a better way to do this
  const [state, setState] = useState(3);
  const [bidPrice, setBidPrice] = useState(0);
  const [askPrice, setAskPrice] = useState(0);
  const [myBidPrice, setMyBidPrice] = useState(NaN);
  const [myAskPrice, setMyAskPrice] = useState(NaN);
  const [score, setScore] = useState(0);
  const [mySpread, setMySpread] = useState('');
  const [officialSpread, setOfficialSpread] = useState(0);
  const [waitingFor, setWaitingFor] = useState('round');
  const [myDiff, setMyDiff] = useState(0);

  socket.emit("requestRoom", props.room);

  
  //trade parseInt for parseDouble
  const bid = () => {
    if (isNaN(parseInt(mySpread))) return; //entered not a number somehow
    socket.emit('bid', parseInt(mySpread), props.usn, props.room, props.id);
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
    socket.emit('playerTrade', 'sell', props.usn, props.room);
  }

  var display;
  
  //if behind, update state!
  useEffect(() => {
    if(props.behind) {
      socket.emit('getScoreBoardData', props.id);

      socket.emit('getGameData', props.id);
      props.setBehind(false);
    }
  });

  socket.on('scoreBoardData', ({username, score}) => {
    console.log('got scoreboardData');
    setScore(score);
    props.setUsn(username);

  });

  socket.on('giveGameData', (gameData) => {
    console.log('got gameData', gameData);
    const gameState = gameData.state;
    props.setRoom(gameData.room);
    //'setting-topic', 'bidding-down-spread', 
    //'market-maker-setting-line', 'trading', 'round-stats'
    switch(gameState) {
      case 'setting-topic':
        setWaitingFor('round');
        setState(3);
        break;
      case 'bidding-down-spread':
        setState(0);
        console.log(state);
        break;
      case 'market-maker-setting-line':
        if(gameData.isMarketMaker) {
          setOfficialSpread(gameData.spreadWidth);
          setState(1);
        } else {
          setWaitingFor('Market Maker');
          setState(3);
        }
        break;
      case 'trading':
        if(gameData.isMarketMaker) {
          setWaitingFor('traders on your market');
          setState(3);
        } else {
          if(gameData.alreadyTraded) {
            setWaitingFor('other traders');
            setState(3);
          } else {
            setBidPrice(gameData.bidPrice);
            setAskPrice(gameData.askPrice);
            setState(2);
          }
        }
        break;
      case 'round-stats':
        setMyDiff(gameData.scoreChange);
        setState(4);
        break;
    }
  });

  //0: bidding down spread, 1: setting line, 2: buy/selling, 3: waiting for various things, 4: leaderboard
  if (state === 0) {
    socket.on('startLineSettingMarketMaker', (spread) => {
      setOfficialSpread(spread);
      setState(1);
    });
    socket.on('startLineSettingPlayer', (mmID) => {
      if(props.id != mmID) {
        setWaitingFor('Market Maker');
        setState(3);
      }
    });
    display =
      <p>
        <h1>Bid:</h1>
        <input id="newSpread" type="text" placeholder="your bid" autoFocus='true' value={mySpread} onChange={e=> setMySpread(e.target.value)}/>
        <Button variant="primary" onClick = {bid}>Bid</Button>
      </p>
  } else if (state === 1) {
    //officially the market maker
    //fix this with parseint.
    socket.on('marketMakerLineConfirmed', () => {
      setMyBidPrice(NaN);
      setMyAskPrice(NaN);
      setWaitingFor('traders on your market');
      setState(3);
    });
    display = 
      <p>
        <h1>{myBidPrice} @ {myAskPrice}</h1>
        <input id="Bid Price" type="text" placeholder="Bid Price" autoFocus='true' onChange={e=> updateLine(e.target.value)}/> 
        <Button variant="primary" onClick = {setLine}>Confirm</Button>
      </p>
  } else if (state === 2) {
    //buying and selling
    socket.on('tradeRecievedPlayer', () => {
      setWaitingFor('other traders');
      setState(3);
    });
    display = 
      <p>
        <h2>{bidPrice}@{askPrice}</h2>
        (You can <b>sell to</b> the market maker at {bidPrice} or <b>buy from</b> the market maker at {askPrice})
        <br></br>
        <Button variant="primary" onClick = {playerSell}>Sell</Button>
        <Button variant="primary" onClick = {playerBuy}>Buy</Button>
      </p>
  } else if (state === 3) {
    //waiting room
    socket.on('startBuySellPlayer', (mm, bid, ask) => {
      if(mm !== props.usn) {
        setState(2);
        setBidPrice(bid)
        setAskPrice(ask)
      }
    });
    socket.on('startBiddingPlayer', () => {
      setState(0);
    });
    socket.on('roundResultsPlayer', (usnDiff) => {
      setMyDiff(usnDiff[props.usn]);
      //setScore(score+usnDiff[props.usn]); no idea why but this doens't work
      let t = score+usnDiff[props.usn];
      setScore(t);
      setState(4);
    });
    display = 
      <p>
        Waiting for {waitingFor}...
      </p>;
  } else if (state === 4) {
    socket.on('restartRoundPlayer', () => {
      setWaitingFor('round');
      setMyBidPrice(NaN);
      setMyAskPrice(NaN);
      setMySpread('');
      setState(3);
    });
    display = 
      <p>
        Score Change: {myDiff}
      </p>
  }


  return (
    <>
      {display}
      <Scorebar scr={score} usn={props.usn}/>
    </>
  )
}
