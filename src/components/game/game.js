import { useState , useEffect } from 'react';
import React from 'react';

import Scorebar from '../scorebar/scorebar.js';
import toast from 'react-hot-toast';

import SocketContext from "../../socket";

import { Input, Button, Text, Heading, Stack } from '@chakra-ui/react';

//import loading circle

export default function Game(props) {
  //get socket
  const socket = React.useContext(SocketContext);
  
  //0: bidding down spread, 1: setting line, 2: buy/selling, 3: waiting for leaderboard to update
  //props.usn for username
  //props.room for room
  //props.id for old socketid
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
  const [gameUsername, setGameUsername] = useState(props.usn);

  socket.emit("requestRoom", props.room);


  const userID = props.id;
  
  //trade parseInt for parseDouble
  const bid = () => {
    let tempMySpread = mySpread;
    if (!tempMySpread.match(/^[0-9]*$/) || isNaN(parseInt(tempMySpread))) {
      toast.error('couldn\'t parse spread bid');
      return;
    } else {
      socket.emit('bid', parseInt(mySpread), userID);
    }
  }

  const updateLine = (bidPrice) => {
    let bp = parseInt(bidPrice);
    if (!isNaN(bp)) {
      setMyBidPrice(bp);
      setMyAskPrice(bp+officialSpread);
    }
  }

  const setLine = () => {
    if(!myBidPrice && myBidPrice !== 0) {
      toast.error('couldn\'t parse line');
      return;
    }
    socket.emit('marketMakerSetLine', myBidPrice, myAskPrice, props.room, userID);
  }

  const playerBuy = () => {
    socket.emit('playerTrade', 'buy', userID);
  }
  const playerSell = () => {
    socket.emit('playerTrade', 'sell', userID);
  }

  var display;
  
  //if behind, update state!
  const behind = props.behind;
  const setBehind = props.setBehind;
  useEffect(() => {
    if(behind) {
      socket.emit('getScoreBoardData', userID);
      socket.emit('getGameData', userID);
      setBehind(false);
    }
  }, [behind, setBehind, userID, socket]);


  const setRoom = props.setRoom;
  useEffect(() => {
    socket.on('scoreBoardData', ({username, score}) => {
      console.log('got scoreboardData');
      setScore(score);
      setGameUsername(username);
    });

    socket.on('giveGameData', (gameData) => {
      const gameState = gameData.state;
      setRoom(gameData.room);
      //'setting-topic', 'bidding-down-spread', 
      //'market-maker-setting-line', 'trading', 'round-stats'
      switch(gameState) {
        case 'setting-topic':
          setWaitingFor('round');
          setState(3);
          break;
        case 'bidding-down-spread':
          setState(0);
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
          setMyDiff(gameData.scoreChange); //I suspect this function is fishy.
          setState(4);
          break;
        default:
          //problem!
          console.log(gameData);
          return;
      }
    });

    socket.on('startLineSettingMarketMaker', (spread) => {
      setOfficialSpread(spread);
      setState(1);
    });
    socket.on('startLineSettingPlayer', (mmID) => {
      if(userID !== mmID) {
        setWaitingFor('Market Maker');
        setState(3);
      }
    });
    socket.on('marketMakerLineConfirmed', () => {
      setMyBidPrice(NaN);
      setMyAskPrice(NaN);
      setWaitingFor('traders on your market');
      setState(3);
    });
    socket.on('tradeRecievedPlayer', () => {
      setWaitingFor('other traders');
      setState(3);
    });
    socket.on('startBuySellPlayer', (mmID, bid, ask) => {
      if(mmID !== userID) {
        setState(2);
        setBidPrice(bid)
        setAskPrice(ask)
      }
    });
    socket.on('startBiddingPlayer', () => {
      setState(0);
    });
    socket.on('restartRoundPlayer', () => {
      setWaitingFor('round');
      setMyBidPrice(NaN);
      setMyAskPrice(NaN);
      setMySpread('');
      setState(3);
    });

    //errors
    
    socket.on('spreadTooLarge', () => {
      toast.error('spread must be at least 10% smaller');
    });

    socket.on('bidAccepted', (newSpread, uID) => {
      if(uID === userID) {
        toast.success('bid successful at ' + newSpread);
      }
    });
  }, [socket, userID, setRoom]);


  useEffect(() => {
    socket.on('roundResultsPlayer', (idDiff) => {
      setMyDiff(idDiff[userID]);
      setScore(score + idDiff[userID]);
      setState(4);
      //console.log('--'); -> this will log many times - find a better solution
    });
  }, [score, socket, userID]);

  //0: bidding down spread, 1: setting line, 2: buy/selling, 3: waiting for various things, 4: leaderboard
  
  if (state === 0) {
    //socket.on('startLineSettingMarketMaker', (spread) => {
    //  setOfficialSpread(spread);
    //  setState(1);
    //});
    //socket.on('startLineSettingPlayer', (mmID) => {
    //  if(props.id != mmID) {
    //    setWaitingFor('Market Maker');
    //    setState(3);
    //  }
    //});
    display =
      <>
        <Heading as='h1' size='4xl' mb='50px'>Bid:</Heading>
        <p>
          <Input id="newSpread" type="text" width='250px' placeholder="your bid" _placeholder={{color: '#D8DEE9'}} value={mySpread || ''} onChange={e=> setMySpread(e.target.value)}/>
          <Button variant="solid" onClick = {bid} colorScheme='blue'>Bid</Button>
        </p>
      </>
  } else if (state === 1) {
    //officially the market maker
    //fix this with parseint.
    //socket.on('marketMakerLineConfirmed', () => {
    //  setMyBidPrice(NaN);
    //  setMyAskPrice(NaN);
    //  setWaitingFor('traders on your market');
    //  setState(3);
    //});
    display = 
      <>
        <Heading as='h1' size='4xl' p='50px'>{myBidPrice} @ {myAskPrice}</Heading>
        <p>
          <Input id="Bid Price" type="text" width='250px' placeholder="Bid Price" _placeholder={{color: '#D8DEE9'}}  autoFocus={true} onChange={e=> updateLine(e.target.value)}/> 
          <Button variant="solid" onClick = {setLine} colorScheme='blue'>Confirm</Button>
        </p>
      </>
  } else if (state === 2) {
    //buying and selling
    //socket.on('tradeRecievedPlayer', () => {
    //  setWaitingFor('other traders');
    //  setState(3);
    //});
    display = 
      <>
        <Heading as='h2' size='2xl' p='50px'>{bidPrice}@{askPrice}</Heading>
        <p>
          (You can <b>sell to</b> the market maker at {bidPrice} or <b>buy from</b> the market maker at {askPrice})
        </p>

        <Stack spacing={0} direction='row' align='center' p='20px'>
          <Button variant="solid" colorScheme='red' onClick = {playerSell}>Sell</Button>
          <Button variant="solid" colorScheme='green' onClick = {playerBuy}>Buy</Button>
        </Stack>
      </>
  } else if (state === 3) {
    //waiting room
    //socket.on('startBuySellPlayer', (mm, bid, ask) => {
    //  if(mm !== props.usn) {
    //    setState(2);
    //    setBidPrice(bid)
    //    setAskPrice(ask)
    //  }
    //});
    //socket.on('startBiddingPlayer', () => {
    //  setState(0);
    //});
    //socket.on('roundResultsPlayer', (usnDiff) => {
    //  setMyDiff(usnDiff[props.usn]);
    //  //setScore(score+usnDiff[props.usn]); no idea why but this doens't work
    //  let t = score+usnDiff[props.usn];
    //  setScore(t);
    //  setState(4);
    //});
    display = 
      <p>
        Waiting for {waitingFor}...
      </p>;
  } else if (state === 4) {
    //socket.on('restartRoundPlayer', () => {
    //  setWaitingFor('round');
    //  setMyBidPrice(NaN);
    //  setMyAskPrice(NaN);
    //  setMySpread('');
    //  setState(3);
    //});
    display = 
      <p>
        Score Change: {myDiff}
      </p>
  }


  return (
    <>
      {display}
      <Scorebar scr={score} usn={gameUsername}/>
    </>
  )
}
